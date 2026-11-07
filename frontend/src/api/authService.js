import { apiClient } from './httpClient.js';

export const authApi = {
  login(credentials) {
    return apiClient.post('/auth/login', credentials)
  },

  // revokes the session of this refresh token (T123, M12)
  logout(refreshToken) {
    return apiClient.post('/auth/logout', { refreshToken })
  },

  getUserProfile() {
    return apiClient.get('/users/profile')
  },

  // the user behind the token, e.g. after the Google callback (decision Q9)
  getAuthProfile() {
    return apiClient.get('/auth/profile')
  },

  register(userData) {
    // Expects: { email, password, username?, firstname?, lastname? }
    return apiClient.post('/auth/register', userData)
  },
  
  changePassword(data) {
    return apiClient.post('/auth/change-password', data)
  },

  forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email })
  },

  setNewPassword(password) {
    return apiClient.post('/auth/set-new-password', { password })
  }
}