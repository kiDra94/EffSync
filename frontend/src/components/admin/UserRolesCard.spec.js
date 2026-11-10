import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserRolesCard from './UserRolesCard.vue'

const roles = [{ role_id: 1, name: 'Superuser' }, { role_id: 2, name: 'Student' }, { role_id: 3, name: 'Teacher' }]
const max = { user_id: 1, user_roles: [{ role_id: 1, roles: { name: 'Superuser' } }] }
const felix = { user_id: 4, user_roles: [{ role_id: 2, roles: { name: 'Student' } }] }

// UC-31 (Definition of done: out of AdminView): a user's roles
describe('UserRolesCard', () => {
  it('lists the roles and removes one', async () => {
    const wrapper = mount(UserRolesCard, { props: { user: felix, roles, users: [max, felix], busy: false } })

    expect(wrapper.find('h3').text()).toContain('(1)')
    expect(wrapper.find('.role-name').text()).toBe('Student')
    await wrapper.find('.btn-remove').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([[2]])
  })

  it('keeps the last Superuser or Admin', () => {
    const wrapper = mount(UserRolesCard, { props: { user: max, roles, users: [max, felix], busy: false } })

    expect(wrapper.find('.btn-remove').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.btn-remove').attributes('title')).toBe('Es muss mindestens 1 Superuser existieren')
  })

  it('adds the chosen role and clears the choice', async () => {
    const wrapper = mount(UserRolesCard, { props: { user: felix, roles, users: [max, felix], busy: false } })

    expect(wrapper.find('.btn-add').attributes('disabled')).toBeDefined()
    await wrapper.find('select').setValue('3')
    await wrapper.find('.btn-add').trigger('click')

    expect(wrapper.emitted('add')).toEqual([[3]])
    expect(wrapper.find('select').element.value).toBe('')
  })
})
