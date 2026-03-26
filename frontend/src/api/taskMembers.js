import { apiClient } from './httpClient';

/**
 * Task-Members API Service
 * 
 * Verwaltet Task-Mitgliedschaften mit Permission-Checks
 * und Timeout-Handling.
 */
export const taskMembersApi = {
  /**
   * Holt alle Mitglieder einer Task
   * GET /api/tasks/:taskId/members
   */
  getTaskMembers(taskId) {
    return apiClient.get(`/api/tasks/${taskId}/members`);
  },

  /**
   * Fügt einen Benutzer zu einer Task hinzu
   * POST /api/tasks/:taskId/members
   * Body: { user_id: number }
   */
  addTaskMember(taskId, data) {
    return apiClient.post(`/api/tasks/${taskId}/members`, data);
  },

  /**
   * Entfernt einen Benutzer von einer Task
   * DELETE /api/tasks/:taskId/members/:userId
   */
  removeTaskMember(taskId, userId) {
    return apiClient.delete(`/api/tasks/${taskId}/members/${userId}`);
  },

  /**
   * Prüft die Berechtigungen des aktuellen Users für eine Task
   * GET /api/tasks/:taskId/members/check-permission
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
    return apiClient.get(`/api/tasks/${taskId}/members/check-permission`);
  }
};
