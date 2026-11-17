import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import UserPermissionsCard from './UserPermissionsCard.vue'

const permissions = [{ permission_id: 1, name: 'view_dashboard' }, { permission_id: 6, name: 'view_grades' }]
const user = {
  user_id: 4,
  user_permissions: [
    { permissions: { permission_id: 6, name: 'view_grades' }, valid_from: '2026-02-01T00:00:00Z', valid_to: '2026-06-30T00:00:00Z' },
  ],
}

// a user's direct permissions with their validity (Definition of done: out of AdminView)
describe('UserPermissionsCard', () => {
  it('lists the direct permissions with their dates and removes one', async () => {
    const wrapper = mount(UserPermissionsCard, { props: { user, permissions, busy: false } })

    expect(wrapper.find('h3').text()).toContain('(1)')
    expect(wrapper.find('.permission-name').text()).toBe('view_grades')
    expect(wrapper.find('.permission-dates').text()).toContain('1.2.2026')
    expect(wrapper.find('.permission-dates').text()).toContain('30.6.2026')
    await wrapper.find('.btn-remove').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([[6]])
  })

  it('adds a permission with an optional validity and clears the form once it is added', async () => {
    const onAdd = vi.fn().mockResolvedValue(true)
    const wrapper = mount(UserPermissionsCard, { props: { user: { user_id: 4, user_permissions: [] }, permissions, busy: false, onAdd } })

    expect(wrapper.find('.no-items').exists()).toBe(true)
    await wrapper.find('select').setValue('1')
    await wrapper.find('#valid-to').setValue('2026-12-31')
    await wrapper.find('.btn-add').trigger('click')
    await flushPromises()

    expect(onAdd).toHaveBeenCalledWith({ permissionId: 1, validFrom: null, validTo: '2026-12-31' })
    expect(wrapper.find('select').element.value).toBe('')
    expect(wrapper.find('#valid-to').element.value).toBe('')
  })

  // review: as before the split, a failed add keeps the entries for a retry
  it('keeps the entries when adding fails', async () => {
    const onAdd = vi.fn().mockResolvedValue(false)
    const wrapper = mount(UserPermissionsCard, { props: { user: { user_id: 4, user_permissions: [] }, permissions, busy: false, onAdd } })

    await wrapper.find('select').setValue('1')
    await wrapper.find('#valid-to').setValue('2026-12-31')
    await wrapper.find('.btn-add').trigger('click')
    await flushPromises()

    expect(wrapper.find('select').element.value).toBe('1')
    expect(wrapper.find('#valid-to').element.value).toBe('2026-12-31')
  })
})
