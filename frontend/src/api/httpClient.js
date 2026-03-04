import axios from 'axios';

let authStore = null;

export const setAuthStore = (store) => {
    authStore = store;
};

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor - Token hinzufügen
apiClient.interceptors.request.use(
    config => {
        // ✅ Token aus localStorage holen und mitsenden
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => { return Promise.reject(error) }
);

// Response Interceptor
apiClient.interceptors.response.use(
    response => response,
    async error => {
        // 1. Rate Limiting (429)
        if (error.response?.status === 429) {
            console.error('Rate Limit erreicht');
            return Promise.reject(new Error('Zu viele Anfragen. Bitte warte kurz.'));
        }

        // 2. Unauthorized (401) - Logout
        if (error.response?.status === 401) {
            if (authStore) {
                await authStore.logout();
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;