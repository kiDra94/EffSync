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

  // the own profile picture (T47, decision Q8c, M27): image only, at most 1 MB
  uploadAvatar(file) {
    const form = new FormData()
    form.append('file', file)
    return apiClient.put('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteAvatar() {
    return apiClient.delete('/users/me/avatar')
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
  },

  // two-factor authentication (T31, UC-01b, M32)
  verifyTwoFactor({ challenge_token, code }) {
    return apiClient.post('/auth/2fa/verify', { challenge_token, code })
  },

  getTwoFactorStatus() {
    return apiClient.get('/auth/2fa')
  },

  setupTwoFactor() {
    return apiClient.post('/auth/2fa/setup')
  },

  enableTwoFactor(code) {
    return apiClient.post('/auth/2fa/enable', { code })
  },

  disableTwoFactor(code) {
    return apiClient.post('/auth/2fa/disable', { code })
  }
}