import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

const admin = vi.hoisted(() => ({
  fetchUsers: vi.fn(), fetchRoles: vi.fn(), fetchPermissions: vi.fn(), deleteUser: vi.fn(), fetchMyRoles: vi.fn(),
  assignRole: vi.fn(), removeRole: vi.fn(), assignPermission: vi.fn(), removePermission: vi.fn(),
}))
vi.mock('@/stores/entities/adminStore', () => ({ useAdminStore: () => admin }))
const auth = reactive({ isAdmin: true, userRole: 'admin', userId: 1 })
vi.mock('@/stores/authStore.js', () => ({ useAuthStore: () => auth }))

import AdminView from './AdminView.vue'

const users = [
  { user_id: 1, firstname: 'Max', lastname: 'Admin', email: 'max@htl.at', user_roles: [] },
  { user_id: 4, firstname: 'Felix', lastname: 'Fuchs', email: 'felix@htl.at', user_roles: [] },
]
const stubs = {
  UserAccountForm: { name: 'UserAccountForm', props: ['user'], emits: ['saved', 'cancel'], template: '<div class="account-form-stub" />' },
  SystemConfiguration: { name: 'SystemConfiguration', template: '<div class="system-config-stub" />' },
}
const mountView = async () => {
  const wrapper = mount(AdminView, { global: { stubs } })
  await flushPromises()
  return wrapper
}
const card = (wrapper, name) => wrapper.findAll('.user-card').find((c) => c.text().includes(name))

// T75 (UC-30, decision Q17) and T77 (UC-40, decision Q18), M35
describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.userRole = 'admin'
    admin.fetchUsers.mockResolvedValue(users)
    admin.fetchRoles.mockResolvedValue([])
    admin.fetchPermissions.mockResolvedValue([])
    admin.fetchMyRoles.mockResolvedValue(['Admin'])
  })

  describe('Benutzerverwaltung', () => {
    it('opens the form for a new account and reloads the list after saving', async () => {
      const wrapper = await mountView()

      await wrapper.find('.btn-new-user').trigger('click')
      const form = wrapper.findComponent({ name: 'UserAccountForm' })
      expect(form.props('user')).toBeNull()

      form.vm.$emit('saved', { user_id: 9 })
      await flushPromises()
      expect(admin.fetchUsers).toHaveBeenCalledTimes(2)
      expect(wrapper.findComponent({ name: 'UserAccountForm' }).exists()).toBe(false)
    })

    it("edits the selected user's account", async () => {
      const wrapper = await mountView()

      await card(wrapper, 'Felix').trigger('click')
      await wrapper.find('.btn-edit-user').trigger('click')

      expect(wrapper.findComponent({ name: 'UserAccountForm' }).props('user')).toMatchObject({ user_id: 4 })
    })

    it('deletes an account only after confirming', async () => {
      admin.deleteUser.mockResolvedValue({})
      const wrapper = await mountView()
      await card(wrapper, 'Felix').trigger('click')

      await wrapper.find('.btn-delete-user').trigger('click')
      expect(admin.deleteUser).not.toHaveBeenCalled()
      expect(wrapper.find('.delete-confirm').text()).toContain('Felix Fuchs')

      await wrapper.find('.btn-confirm-delete').trigger('click')
      await flushPromises()
      expect(admin.deleteUser).toHaveBeenCalledWith(4)
      expect(admin.fetchUsers).toHaveBeenCalledTimes(2)
      expect(wrapper.find('.details-section').exists()).toBe(false)
    })

    // review M35: the deletion stands even if the list fails to reload
    it('reports a deletion that worked even when the list fails to reload', async () => {
      admin.deleteUser.mockResolvedValue({})
      const wrapper = await mountView()
      await card(wrapper, 'Felix').trigger('click')
      admin.fetchUsers.mockRejectedValue(new Error('offline'))

      await wrapper.find('.btn-delete-user').trigger('click')
      await wrapper.find('.btn-confirm-delete').trigger('click')
      await flushPromises()

      expect(wrapper.find('.account-error').text()).toBe(
        'Das Konto wurde gelöscht, die Liste konnte aber nicht neu geladen werden.',
      )
    })

    // review: the cards are keyed by the user, so a half-filled form doesn't
    // carry over (before the split, selectUser cleared it)
    it('starts the next user with an empty role choice', async () => {
      admin.fetchRoles.mockResolvedValue([{ role_id: 2, name: 'Student' }])
      const wrapper = await mountView()
      await card(wrapper, 'Felix').trigger('click')
      await wrapper.find('#role-select').setValue('2')

      await card(wrapper, 'Max').trigger('click')

      expect(wrapper.find('#role-select').element.value).toBe('')
    })

    it('offers no delete for the own account', async () => {
      const wrapper = await mountView()

      await card(wrapper, 'Max').trigger('click')

      expect(wrapper.find('.btn-delete-user').exists()).toBe(false)
    })
  })

  describe('Systemkonfiguration', () => {
    it('is a tab for the Superuser only', async () => {
      const asAdmin = await mountView()
      expect(asAdmin.find('[data-tab="system"]').exists()).toBe(false)

      // review M35: any of the user's roles counts, not only the first one
      admin.fetchMyRoles.mockResolvedValue(['Admin', 'Superuser'])
      const asSuperuser = await mountView()
      await asSuperuser.find('[data-tab="system"]').trigger('click')

      expect(asSuperuser.findComponent({ name: 'SystemConfiguration' }).exists()).toBe(true)
      expect(asSuperuser.find('.users-section').exists()).toBe(false)
    })
  })
})
