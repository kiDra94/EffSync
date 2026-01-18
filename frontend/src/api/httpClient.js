import axios from 'axios';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export let getAuthStoreFunc = null;

export const setAuthStoreFunc = (func) => {
    getAuthStoreFunc = func;
};

const getAuthStore = () => {
    try {
        const authStore = require('@/stores/authStore')
        return authStore.useAuthStore()
    } catch (e) {
        console.log(e);
        return { token: null, logout: () => { } }
    }
}

apiClient.interceptors.request.use(
    config => {
        const token = getAuthStore().token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

apiClient.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            getAuthStore().logout();
        }
        return Promise.reject(error);
    }
);

export default apiClient;