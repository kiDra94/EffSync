import { apiClient } from './httpClient';

/**
 * Admin service for managing users, roles and permissions
 */

export const adminService = {
  /**
   * Returns all users
   */
  async getAllUsers() {
    const response = await apiClient.get('/users');
    return response.data;
  },

  /**
   * Returns one user with their permissions and roles
   */
  async getUserWithPermissions(userId) {
    const response = await apiClient.get(`/users/${userId}/permissions`);
    return response.data;
  },

  // the accounts themselves (T75, UC-30, decision Q17, M35)
  async createUser(data) {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  async updateUser(userId, changes) {
    const response = await apiClient.patch(`/users/${userId}`, changes);
    return response.data;
  },

  // the content moves to the ghost user (M14)
  async deleteUser(userId) {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  },

  // the signed-in user's role names, all of them (review M35: the token names the first only)
  async getMyRoleNames() {
    const response = await apiClient.get('/users/me/permissions');
    return (response.data?.roles ?? []).map((role) => role.name);
  },

  // the Superuser's system configuration (T77, decisions Q18, I2, M35)
  async setRolePermissions(roleId, permissions) {
    const response = await apiClient.put(`/roles/${roleId}/permissions`, { permissions });
    return response.data;
  },

  /**
   * Returns all available roles
   */
  async getAllRoles() {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  /**
   * Returns all available permissions
   */
  async getAllPermissions() {
    const response = await apiClient.get('/permissions');
    return response.data;
  },

  /**
   * Assigns a role to a user
   */
  async assignRoleToUser(userId, roleId) {
    const response = await apiClient.post(`/users/${userId}/roles`, {
      role_id: roleId,
    });
    return response.data;
  },

  /**
   * Removes a role from a user
   */
  async removeRoleFromUser(userId, roleId) {
    const response = await apiClient.delete(`/users/${userId}/roles/${roleId}`);
    return response.data;
  },

  /**
   * Assigns a permission to a user
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
   * Removes a permission from a user
   */
  async removePermissionFromUser(userId, permissionId) {
    const response = await apiClient.delete(`/users/${userId}/permissions/${permissionId}`);
    return response.data;
  },
};
