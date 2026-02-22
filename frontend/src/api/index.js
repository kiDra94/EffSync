import axios from 'axios'

// 1. Axios Instanz erstellen
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', // Passe dies an deine Backend-URL an
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// 2. Request Interceptor: Fügt automatisch den Token hinzu
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// 3. API-Definitionen exportieren
export { apiClient }

export const authApi = {
  login(credentials) {
    // Erwartet { username, password }
    return apiClient.post('/login', credentials)
  },
  logout() {
    return apiClient.post('/logout')
  },
  getUserProfile() {
    // Das ersetzt deinen direkten axios Aufruf im Store
    return apiClient.get('/user/profile')
  }
}