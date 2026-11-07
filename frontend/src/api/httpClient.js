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

// Request interceptor - adds the token
apiClient.interceptors.request.use(
    config => {
        // ✅ Read the token from localStorage and send it along
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => { return Promise.reject(error) }
);

// Endpoints whose 401 means wrong input, not an expired session. The
// set-new-password request carries a reset token, never a session's token.
const NO_REFRESH_ENDPOINTS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/set-new-password',
];

// One refresh for all requests that hit a 401 at the same time (T51, M12)
let refreshing = null;

/**
 * Swaps the refresh token for new tokens and returns the new access token.
 * Rejects with `sessionEnded: true` when the server refused the refresh token;
 * any other rejection (network, 429, 500) leaves the session alone.
 * Exported for the WebSocket reconnect (socketAuth.js).
 */
export function refreshSession() {
    if (!refreshing) {
        const refreshToken = localStorage.getItem('refreshToken');
        refreshing = (refreshToken
            ? apiClient.post('/auth/refresh', { refreshToken })
            : Promise.reject(Object.assign(new Error('Kein Refresh-Token'), { sessionEnded: true }))
        )
            .then(({ data }) => {
                // the refresh token rotates: the old one is no longer valid
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('refreshToken', data.refreshToken);
                if (authStore) {
                    authStore.token = data.token;
                }
                return data.token;
            })
            .catch((error) => {
                if (error.response?.status !== 401) {
                    throw error;
                }
                // another tab of this browser rotated the shared token first
                const current = localStorage.getItem('refreshToken');
                if (current && current !== refreshToken) {
                    return localStorage.getItem('authToken');
                }
                error.sessionEnded = true;
                throw error;
            })
            .finally(() => { refreshing = null; });
    }
    return refreshing;
}

// Response Interceptor
apiClient.interceptors.response.use(
    response => response,
    async error => {
        // 1. Rate Limiting (429)
        if (error.response?.status === 429) {
            console.error('Rate Limit erreicht');
            return Promise.reject(new Error('Zu viele Anfragen. Bitte warte kurz.'));
        }

        // 2. Unauthorized (401): refresh once and retry, log out if the session ended
        const request = error.config;
        if (error.response?.status === 401 && !NO_REFRESH_ENDPOINTS.includes(request?.url)) {
            if (!request.retriedAfterRefresh) {
                request.retriedAfterRefresh = true;
                // the request interceptor puts the current token on the retry
                const current = localStorage.getItem('authToken');
                if (current && request.headers.Authorization !== `Bearer ${current}`) {
                    // a refresh finished after this request went out
                    return apiClient(request);
                }
                try {
                    await refreshSession();
                    // a 401 on the retry ends in this interceptor again and logs out there
                    return apiClient(request);
                } catch (refreshError) {
                    if (!refreshError.sessionEnded) {
                        return Promise.reject(error);
                    }
                }
            }
            if (authStore) {
                await authStore.logout();
            }
        }

        return Promise.reject(error);
    }
);
