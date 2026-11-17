import { apiClient } from '@/api/httpClient';

// a task's comments (@mentions are mailed) and the teachers' grading remarks
// (T09, T74, decision Q16, M27)
export const taskCommentsApi = {
  getComments: (taskId) => apiClient.get(`/tasks/${taskId}/comments`),
  createComment: (taskId, content) => apiClient.post(`/tasks/${taskId}/comments`, { content }),
  getGradeRemarks: (taskId) => apiClient.get(`/tasks/${taskId}/grade-remarks`),
  createGradeRemark: (taskId, text) => apiClient.post(`/tasks/${taskId}/grade-remarks`, { text }),
};
