import { apiClient } from './httpClient.js';

export const authApi = {
  login(credentials) {
    return apiClient.post('/login', credentials)
  },
  logout() {
    return apiClient.post('/logout')
  },
  getUserProfile() {
    return apiClient.get('/user/profile')
  },

  register(userData) {
    // Erwartet { username, email, password, password_confirmation }
    return apiClient.post('/register', userData)
  },
  forgotPassword(email) {
    return apiClient.post('/forgot-password', { email })
  }
}