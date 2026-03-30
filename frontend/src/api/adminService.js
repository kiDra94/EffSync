import { apiClient } from './httpClient';

/**
 * Admin Service für die Verwaltung von Benutzern, Rollen und Permissions
 */

export const adminService = {
  /**
   * Holt alle Benutzer
   */
  async getAllUsers() {
    const response = await apiClient.get('/users');
    return response.data;
  },

  /**
   * Holt einen spezifischen Benutzer mit seinen Permissions und Rollen
   */
  async getUserWithPermissions(userId) {
    const response = await apiClient.get(`/users/${userId}/permissions`);
    return response.data;
  },

  /**
   * Holt alle verfügbaren Rollen
   */
  async getAllRoles() {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  /**
   * Holt alle verfügbaren Permissions
   */
  async getAllPermissions() {
    const response = await apiClient.get('/permissions');
    return response.data;
  },

  /**
   * Weist eine Rolle einem Benutzer zu
   */
  async assignRoleToUser(userId, roleId) {
    const response = await apiClient.post(`/users/${userId}/roles`, {
      role_id: roleId,
    });
    return response.data;
  },

  /**
   * Entfernt eine Rolle von einem Benutzer
   */
  async removeRoleFromUser(userId, roleId) {
    const response = await apiClient.delete(`/users/${userId}/roles/${roleId}`);
    return response.data;
  },

  /**
   * Weist eine Permission einem Benutzer zu
   */
  async assignPermissionToUser(userId, permissionId, validFrom = null, validTo = null) {
    const response = await apiClient.post(`/users/${userId}/permissions`, {
      permission_id: permissionId,
      valid_from: validFrom,
      valid_to: validTo,
    });
    return response.data;
  },

  /**
   * Entfernt eine Permission von einem Benutzer
   */
  async removePermissionFromUser(userId, permissionId) {
    const response = await apiClient.delete(`/users/${userId}/permissions/${permissionId}`);
    return response.data;
  },
};
