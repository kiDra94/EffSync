import { apiClient } from './httpClient';

/**
 * Users API Service
 * 
 * Verwaltet Benutzer, Rollen und Permissions
 */
export const usersApi = {
  // ============ Profil & Permissions ============

  /**
   * Holt das Profil des aktuellen Benutzers
   * GET /users/profile
   */
  getProfile() {
    return apiClient.get('/users/profile');
  },

  /**
   * Holt alle Rollen und Permissions des aktuellen Benutzers
   * GET /users/me/permissions
   */
  getMyPermissions() {
    return apiClient.get('/users/me/permissions');
  },

  /**
   * Holt Rollen und Permissions eines spezifischen Benutzers
   * GET /users/:id/permissions
   */
  getUserPermissions(userId) {
    return apiClient.get(`/users/${userId}/permissions`);
  },

  // ============ User Management ============

  /**
   * Holt alle Benutzer
   * GET /users
   */
  getAll() {
    return apiClient.get('/users');
  },

  /**
   * Holt alle Benutzer für Auswahl/Dropdown ohne Permissions-Anforderung
   * GET /users/for-chat
   */
  getAllForSelection() {
    return apiClient.get('/users/for-chat');
  },

  /**
   * Holt einen spezifischen Benutzer
   * GET /users/:id
   */
  getUser(id) {
    return apiClient.get(`/users/${id}`);
  },

  /**
   * Aktualisiert einen Benutzer
   * PATCH /users/:id
   */
  updateUser(id, data) {
    return apiClient.patch(`/users/${id}`, data);
  },

  /**
   * Löscht einen Benutzer
   * DELETE /users/:id
   */
  deleteUser(id) {
    return apiClient.delete(`/users/${id}`);
  },

  // ============ Permission Management ============

  /**
   * Holt alle verfügbaren Permissions
   * GET /permissions (oder ähnlich)
   */
  getAllPermissions() {
    return apiClient.get('/permissions');
  },

  /**
   * Fügt eine Permission zu einem User hinzu
   * POST /users/:id/permissions
   * Body: { permission_id: number, valid_from?: string, valid_to?: string }
   */
  addPermissionToUser(userId, data) {
    return apiClient.post(`/users/${userId}/permissions`, data);
  },

  /**
   * Entfernt eine Permission von einem User
   * DELETE /users/:id/permissions/:permissionId
   */
  removePermissionFromUser(userId, permissionId) {
    return apiClient.delete(`/users/${userId}/permissions/${permissionId}`);
  },

  // ============ Role Management ============

  /**
   * Holt alle verfügbaren Rollen
   * GET /roles (oder ähnlich)
   */
  getAllRoles() {
    return apiClient.get('/roles');
  },

  /**
   * Weist eine Rolle zu einem User zu
   * POST /users/:id/roles
   * Body: { role_id: number }
   */
  addRoleToUser(userId, data) {
    return apiClient.post(`/users/${userId}/roles`, data);
  },

  /**
   * Entfernt eine Rolle von einem User
   * DELETE /users/:id/roles/:roleId
   */
  removeRoleFromUser(userId, roleId) {
    return apiClient.delete(`/users/${userId}/roles/${roleId}`);
  }
};
