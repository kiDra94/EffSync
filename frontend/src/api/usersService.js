import { apiClient } from './httpClient';

export const usersApi = {
  // Get current user profile
  getProfile() {
    return apiClient.get('/users/profile');
  },

  // Get current user's permissions and roles
  getMyPermissions() {
    return apiClient.get('/users/me/permissions');
  },

  // Get specific user's permissions and roles
  getUserPermissions(userId) {
    return apiClient.get(`/users/${userId}/permissions`);
  },

  // Get all users
  getAll() {
    return apiClient.get('/users');
  },

  // Get specific user
  getUser(id) {
    return apiClient.get(`/users/${id}`);
  },

  // Update user
  updateUser(id, data) {
    return apiClient.patch(`/users/${id}`, data);
  },

  // Delete user
  deleteUser(id) {
    return apiClient.delete(`/users/${id}`);
  }
};
