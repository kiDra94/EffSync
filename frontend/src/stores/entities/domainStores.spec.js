import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const documents = vi.hoisted(() => ({
  fetchDocuments: vi.fn(), uploadDocument: vi.fn(), renameDocument: vi.fn(), gradeDocument: vi.fn(),
  fetchMyGrades: vi.fn(), deleteDocument: vi.fn(), fetchDocumentBinary: vi.fn(),
}))
const lessonSlots = vi.hoisted(() => ({ fetchAllLessonSlots: vi.fn() }))
const usersApi = vi.hoisted(() => ({ getAll: vi.fn(), getAllForSelection: vi.fn(), getMyPermissions: vi.fn() }))
const taskMembersApi = vi.hoisted(() => ({
  getTaskMembers: vi.fn(), addTaskMember: vi.fn(), removeTaskMember: vi.fn(), checkPermission: vi.fn(),
}))
const adminService = vi.hoisted(() => ({
  getAllUsers: vi.fn(), getAllRoles: vi.fn(), getAllPermissions: vi.fn(), assignRoleToUser: vi.fn(),
  removeRoleFromUser: vi.fn(), assignPermissionToUser: vi.fn(), removePermissionFromUser: vi.fn(),
}))
vi.mock('@/api/documents', () => documents)
vi.mock('@/api/lessonSlots', () => lessonSlots)
vi.mock('@/api/usersService', () => ({ usersApi }))
vi.mock('@/api/taskMembers', () => ({ taskMembersApi }))
vi.mock('@/api/adminService.js', () => ({ adminService }))

import { useDocumentStore } from './documentStore'
import { useLessonSlotStore } from './lessonSlotStore'
import { useUserStore } from './userStore'
import { useTaskMemberStore } from './taskMemberStore'
import { useAdminStore } from './adminStore'

// M25 (T79, T80, decision Q19): views and components reach the api/ layer
// only through stores; each action passes its arguments and answer through
describe.each([
  ['documentStore', useDocumentStore, documents, [
    ['fetchDocuments', 'fetchDocuments', []],
    ['uploadDocument', 'uploadDocument', ['file', 4]],
    ['renameDocument', 'renameDocument', [7, 'Neu']],
    ['gradeDocument', 'gradeDocument', [7, { grade: 1 }]],
    ['fetchMyGrades', 'fetchMyGrades', []],
    ['deleteDocument', 'deleteDocument', [7]],
    ['fetchDocumentBinary', 'fetchDocumentBinary', [7]],
  ]],
  ['lessonSlotStore', useLessonSlotStore, lessonSlots, [['fetchAll', 'fetchAllLessonSlots', []]]],
  ['userStore', useUserStore, usersApi, [
    ['fetchAll', 'getAll', []],
    ['fetchForSelection', 'getAllForSelection', []],
    ['fetchMyPermissions', 'getMyPermissions', []],
  ]],
  ['taskMemberStore', useTaskMemberStore, taskMembersApi, [
    ['fetchMembers', 'getTaskMembers', [4]],
    ['addMember', 'addTaskMember', [4, { user_id: 7 }]],
    ['removeMember', 'removeTaskMember', [4, 7]],
    ['checkPermission', 'checkPermission', [4]],
  ]],
  ['adminStore', useAdminStore, adminService, [
    ['fetchUsers', 'getAllUsers', []],
    ['fetchRoles', 'getAllRoles', []],
    ['fetchPermissions', 'getAllPermissions', []],
    ['assignRole', 'assignRoleToUser', [3, 2]],
    ['removeRole', 'removeRoleFromUser', [3, 2]],
    ['assignPermission', 'assignPermissionToUser', [3, 5, null, '2026-12-31']],
    ['removePermission', 'removePermissionFromUser', [3, 5]],
  ]],
])('%s', (_name, useStore, api, actions) => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it.each(actions)('%s goes through api.%s', async (action, apiFunction, args) => {
    api[apiFunction].mockResolvedValue({ answer: apiFunction })

    await expect(useStore()[action](...args)).resolves.toEqual({ answer: apiFunction })
    expect(api[apiFunction]).toHaveBeenCalledWith(...args)
  })
})
