import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const admin = vi.hoisted(() => ({ createUser: vi.fn(), updateUser: vi.fn() }))
vi.mock('@/stores/entities/adminStore', () => ({ useAdminStore: () => admin }))

import UserAccountForm from './UserAccountForm.vue'

const fill = async (wrapper, values) => {
  for (const [name, value] of Object.entries(values)) {
    await wrapper.find(`input[name="${name}"]`).setValue(value)
  }
}

// T75, UC-30, decision Q17 (M35): admins create and edit the accounts
describe('UserAccountForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an account with a password', async () => {
    admin.createUser.mockResolvedValue({ user_id: 9, firstname: 'Nora' })
    const wrapper = mount(UserAccountForm, { props: { user: null } })

    await fill(wrapper, {
      firstname: 'Nora', lastname: 'Neumann', username: 'nneumann', email: 'nora@htl.at', password: 'geheim-123',
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(admin.createUser).toHaveBeenCalledWith({
      firstname: 'Nora', lastname: 'Neumann', username: 'nneumann', email: 'nora@htl.at', password: 'geheim-123',
    })
    expect(wrapper.emitted('saved')[0]).toEqual([{ user_id: 9, firstname: 'Nora' }])
  })

  // review M35: only what changed, so a seeded short username doesn't block an edit
  it('edits an account with the changed fields only, without a password field', async () => {
    admin.updateUser.mockResolvedValue({ user_id: 4, firstname: 'Felix' })
    const user = { user_id: 4, firstname: 'Fe', lastname: 'Fuchs', username: 'ffuchs', email: 'felix@htl.at' }
    const wrapper = mount(UserAccountForm, { props: { user } })

    expect(wrapper.find('input[name="password"]').exists()).toBe(false)
    expect(wrapper.find('input[name="firstname"]').element.value).toBe('Fe')
    await fill(wrapper, { firstname: 'Felix' })
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(admin.updateUser).toHaveBeenCalledWith(4, { firstname: 'Felix' })
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('closes without a request when nothing changed', async () => {
    const user = { user_id: 4, firstname: 'Felix', lastname: 'Fuchs', username: 'ffuchs', email: 'felix@htl.at' }
    const wrapper = mount(UserAccountForm, { props: { user } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(admin.updateUser).not.toHaveBeenCalled()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it("shows the server's reason when saving fails", async () => {
    admin.createUser.mockRejectedValue({ response: { data: { message: 'Username oder E-Mail bereits vergeben' } } })
    const wrapper = mount(UserAccountForm, { props: { user: null } })

    await fill(wrapper, {
      firstname: 'Nora', lastname: 'Neumann', username: 'nneumann', email: 'nora@htl.at', password: 'geheim-123',
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.form-error').text()).toBe('Username oder E-Mail bereits vergeben')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('cancels without saving', async () => {
    const wrapper = mount(UserAccountForm, { props: { user: null } })

    await wrapper.find('.btn-cancel').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(admin.createUser).not.toHaveBeenCalled()
  })
})
