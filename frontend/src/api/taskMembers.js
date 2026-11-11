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
   * Sets a member's rights on the task (T99, decision I4, M38)
   * PATCH /tasks/:taskId/members/:userId
   * Body: { flags: number } (4 = READ, 2 = WRITE, 1 = EXECUTE)
   */
  setMemberFlags(taskId, userId, flags) {
    return apiClient.patch(`/tasks/${taskId}/members/${userId}`, { flags });
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
