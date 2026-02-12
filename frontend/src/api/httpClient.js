import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    withCredentials: true, // WICHTIG: Erlaubt dem Browser, Cookies (JWT) automatisch zu senden
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor
apiClient.interceptors.request.use(
    config => {
        // HINWEIS: Wenn du auf HttpOnly Cookies umsteigst, 
        // musst du den Authorization-Header hier NICHT mehr manuell setzen!
        // Der Browser macht das für den Cookie von alleine.
        return config;
    },
    error => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    response => response,
    error => {
        const authStore = useAuthStore();

        // 1. Sicherheits-Check: Rate Limiting (429)
        if (error.response?.status === 429) {
            console.error('Rate Limit erreicht');
            // Hier könntest du eine globale Benachrichtigung triggern
            return Promise.reject(new Error('Zu viele Anfragen. Bitte warte kurz.'));
        }

        // 2. Sicherheits-Check: Unauthorized (401)
        if (error.response?.status === 401) {
            authStore.logout(); // Token/Session im Store löschen
            // Optional: Redirect zum Login
            // window.location.href = '/login'; 
        }

        return Promise.reject(error);
    }
);

export default apiClient;