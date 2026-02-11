import axios from 'axios';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

let authStore = null;

export const setAuthStore = (store) => {
    authStore = store;
};

export const setAuthStoreFunc = (func) => {
    getAuthStoreFunc = func;
};

apiClient.interceptors.request.use(
    config => {
        if (authStore.token && authStore) {
            config.headers.Authorization = `Bearer ${authStore.token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

apiClient.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            if (authStore) {
                console.warn('Unauthorized access - logging out');
                authStore.logout();
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;