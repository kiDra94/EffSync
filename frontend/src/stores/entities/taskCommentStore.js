import { defineStore } from 'pinia';
import { taskCommentsApi } from '@/api/taskComments';

/**
 * A task's comments and grading remarks (M27, decision Q19): the views keep
 * the lists, the store hands over the API's answers.
 */
export const useTaskCommentStore = defineStore('taskComment', () => ({
    fetchComments: async (taskId) => (await taskCommentsApi.getComments(taskId)).data,
    addComment: async (taskId, content) => (await taskCommentsApi.createComment(taskId, content)).data,
    fetchGradeRemarks: async (taskId) => (await taskCommentsApi.getGradeRemarks(taskId)).data,
    addGradeRemark: async (taskId, text) => (await taskCommentsApi.createGradeRemark(taskId, text)).data,
}));
