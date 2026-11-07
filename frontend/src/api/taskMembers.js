import { apiClient } from './httpClient';

/**
 * Task-Members API Service
 * 
 * Manages task memberships with permission checks
 * and timeout handling.
 */
export const taskMembersApi = {
  /**
   * Returns all members of a task
   * GET /tasks/:taskId/members
   */
  getTaskMembers(taskId) {
    return apiClient.get(`/tasks/${taskId}/members`);
  },

  /**
   * Adds a user to a task
   * POST /tasks/:taskId/members
   * Body: { user_id: number }
   */
  addTaskMember(taskId, data) {
    return apiClient.post(`/tasks/${taskId}/members`, data);
  },

  /**
   * Removes a user from a task
   * DELETE /tasks/:taskId/members/:userId
   */
  removeTaskMember(taskId, userId) {
    return apiClient.delete(`/tasks/${taskId}/members/${userId}`);
  },

  /**
   * Checks the current user's permissions on a task
   * GET /tasks/:taskId/members/check-permission
   * 
   * Response: {
   *   "task_id": number,
   *   "user_id": number,
   *   "has_read": boolean,
   *   "has_write": boolean,
   *   "has_execute": boolean,
   *   "permission_flags": number
   * }
   */
  checkPermission(taskId) {
    return apiClient.get(`/tasks/${taskId}/members/check-permission`);
  }
};
