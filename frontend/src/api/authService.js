import { apiClient } from './httpClient.js';

export const authApi = {
  login(credentials) {
    return apiClient.post('/auth/login', credentials)
  },

  logout() {
    return apiClient.post('/auth/logout')
  },

  getUserProfile() {
    return apiClient.get('/users/profile')
  },

  register(userData) {
    // Erwartet: { email, password, username?, firstname?, lastname? }
    return apiClient.post('/auth/register', userData)
  },
  
  changePassword(data) {
    return apiClient.post('/auth/change-password', data)
  },

  forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email })
  }
}