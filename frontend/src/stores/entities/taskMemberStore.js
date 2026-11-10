import { defineStore } from 'pinia';
import { taskMembersApi } from '@/api/taskMembers';

/** The members of a task (M25, decision Q19): the answers are the API's. */
export const useTaskMemberStore = defineStore('taskMember', () => ({
    fetchMembers: (taskId) => taskMembersApi.getTaskMembers(taskId),
    addMember: (taskId, data) => taskMembersApi.addTaskMember(taskId, data),
    removeMember: (taskId, userId) => taskMembersApi.removeTaskMember(taskId, userId),
    checkPermission: (taskId) => taskMembersApi.checkPermission(taskId),
}));
