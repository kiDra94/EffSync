import { apiClient } from './httpClient';

/**
 * Users API Service
 * 
 * Manages users, roles and permissions
 */
export const usersApi = {
  // ============ Profile & permissions ============

  /**
   * Returns the current user's profile
   * GET /users/profile
   */
  getProfile() {
    return apiClient.get('/users/profile');
  },

  /**
   * Returns all roles and permissions of the current user
   * GET /users/me/permissions
   */
  getMyPermissions() {
    return apiClient.get('/users/me/permissions');
  },

  /**
   * Returns the roles and permissions of a given user
   * GET /users/:id/permissions
   */
  getUserPermissions(userId) {
    return apiClient.get(`/users/${userId}/permissions`);
  },

  // ============ User Management ============

  /**
   * Returns all users
   * GET /users
   */
  getAll() {
    return apiClient.get('/users');
  },

  /**
   * Returns all users for a selection/dropdown, without a permission requirement
   * GET /users/for-chat
   */
  getAllForSelection() {
    return apiClient.get('/users/for-chat');
  },

  /**
   * Returns one user
   * GET /users/:id
   */
  getUser(id) {
    return apiClient.get(`/users/${id}`);
  },

  /**
   * Updates a user
   * PATCH /users/:id
   */
  updateUser(id, data) {
    return apiClient.patch(`/users/${id}`, data);
  },

  /**
   * Deletes a user
   * DELETE /users/:id
   */
  deleteUser(id) {
    return apiClient.delete(`/users/${id}`);
  },

  // ============ Permission Management ============

  /**
   * Returns all available permissions
   * GET /permissions (or similar)
   */
  getAllPermissions() {
    return apiClient.get('/permissions');
  },

  /**
   * Adds a permission to a user
   * POST /users/:id/permissions
   * Body: { permission_id: number, valid_from?: string, valid_to?: string }
   */
  addPermissionToUser(userId, data) {
    return apiClient.post(`/users/${userId}/permissions`, data);
  },

  /**
   * Removes a permission from a user
   * DELETE /users/:id/permissions/:permissionId
   */
  removePermissionFromUser(userId, permissionId) {
    return apiClient.delete(`/users/${userId}/permissions/${permissionId}`);
  },

  // ============ Role Management ============

  /**
   * Returns all available roles
   * GET /roles (or similar)
   */
  getAllRoles() {
    return apiClient.get('/roles');
  },

  /**
   * Assigns a role to a user
   * POST /users/:id/roles
   * Body: { role_id: number }
   */
  addRoleToUser(userId, data) {
    return apiClient.post(`/users/${userId}/roles`, data);
  },

  /**
   * Removes a role from a user
   * DELETE /users/:id/roles/:roleId
   */
  removeRoleFromUser(userId, roleId) {
    return apiClient.delete(`/users/${userId}/roles/${roleId}`);
  }
};
