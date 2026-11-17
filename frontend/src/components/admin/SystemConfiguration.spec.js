import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const admin = vi.hoisted(() => ({ fetchRoles: vi.fn(), fetchPermissions: vi.fn(), setRolePermissions: vi.fn() }))
vi.mock('@/stores/entities/adminStore', () => ({ useAdminStore: () => admin }))

import SystemConfiguration from './SystemConfiguration.vue'

const permissions = [
  { permission_id: 1, name: 'view_dashboard', flags: 4 },
  { permission_id: 2, name: 'create_tasks', flags: 6 },
  { permission_id: 3, name: 'manage_users', flags: 7 },
]
const roles = [
  { role_id: 1, name: 'Superuser', roles_permissions: permissions.map((p) => ({ permissions: p })) },
  { role_id: 2, name: 'Student', roles_permissions: [{ permissions: permissions[0] }, { permissions: permissions[1] }] },
]
const row = (wrapper, name) => wrapper.find(`tr[data-permission="${name}"]`)

// T77, UC-40, decisions Q18, I2 (M35): the Superuser's role → permission mapping
describe('SystemConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    admin.fetchRoles.mockResolvedValue(roles)
    admin.fetchPermissions.mockResolvedValue(permissions)
    admin.setRolePermissions.mockImplementation(async (roleId, entries) => ({
      ...roles.find((r) => r.role_id === roleId),
      roles_permissions: entries.map((e) => ({ permissions: { ...permissions.find((p) => p.permission_id === e.permission_id), flags: e.flags } })),
    }))
  })

  const mountAndPick = async (roleId) => {
    const wrapper = mount(SystemConfiguration)
    await flushPromises()
    await wrapper.find('select[name="role"]').setValue(String(roleId))
    return wrapper
  }

  it("shows every permission, marked where the role has it, with the permission's flags", async () => {
    const wrapper = await mountAndPick(2)

    expect(row(wrapper, 'view_dashboard').find('input[name="assigned"]').element.checked).toBe(true)
    expect(row(wrapper, 'manage_users').find('input[name="assigned"]').element.checked).toBe(false)
    const createFlags = row(wrapper, 'create_tasks').findAll('input[name="flag"]').map((i) => i.element.checked)
    expect(createFlags).toEqual([true, true, false])
  })

  // review M35: flags only where they changed, so a stale screen undoes nothing
  it("saves the role's new permission set, with the flags that changed", async () => {
    const wrapper = await mountAndPick(2)

    await row(wrapper, 'manage_users').find('input[name="assigned"]').setValue(true)
    await row(wrapper, 'create_tasks').findAll('input[name="flag"]')[1].setValue(false)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(admin.setRolePermissions).toHaveBeenCalledWith(2, [
      { permission_id: 1 },
      { permission_id: 2, flags: 4 },
      { permission_id: 3 },
    ])
    expect(wrapper.find('.config-message').text()).toBe('Gespeichert: Student')
  })

  it('locks the flags of a permission the role does not have', async () => {
    const wrapper = await mountAndPick(2)

    const flags = row(wrapper, 'manage_users').findAll('input[name="flag"]')
    expect(flags.every((input) => input.attributes('disabled') !== undefined)).toBe(true)
  })

  it("shows the server's refusal, e.g. the lock-out guard", async () => {
    admin.setRolePermissions.mockRejectedValue({
      response: { data: { message: 'Der Superuser muss manage_system mit Lese- und Schreibrecht behalten' } },
    })
    const wrapper = await mountAndPick(1)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.config-error').text()).toBe('Der Superuser muss manage_system mit Lese- und Schreibrecht behalten')
  })
})
