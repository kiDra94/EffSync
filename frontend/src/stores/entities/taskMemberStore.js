import { defineStore } from 'pinia';
import { taskMembersApi } from '@/api/taskMembers';

/** The members of a task (M25, decision Q19): the answers are the API's. */
export const useTaskMemberStore = defineStore('taskMember', () => ({
    fetchMembers: (taskId) => taskMembersApi.getTaskMembers(taskId),
    addMember: (taskId, data) => taskMembersApi.addTaskMember(taskId, data),
    removeMember: (taskId, userId) => taskMembersApi.removeTaskMember(taskId, userId),
    setMemberFlags: (taskId, userId, flags) => taskMembersApi.setMemberFlags(taskId, userId, flags),
    checkPermission: (taskId) => taskMembersApi.checkPermission(taskId),
}));
