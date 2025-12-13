import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('authToken'))
    const userId = ref(null)
    const userRole = ref(null)
    const userDetails = ref(null)

    if (token.value) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    }

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => userRole.value === 'admin')

    function initDevMode() {
        if (import.meta.env.DEV) {
            token.value = localStorage.getItem('authToken')
            userId.value = 1
            userRole.value = localStorage.getItem('userRole') || 'admin'
            userDetails.value = {
                id: 1,
                username: 'devuser',
                role: 'admin'
            }
            axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
        }
    }

    async function login(credentials) {
        try {
            if (import.meta.env.DEV && credentials.username === 'dev') {
                initDevMode()
                return { token: token.value, user: userDetails.value }
            }

            const response = await axios.post('/api/auth/login', credentials)
            const { token: newToken, user } = response.data

            token.value = newToken
            userId.value = user.id
            userRole.value = user.role
            userDetails.value = user

            localStorage.setItem('authToken', newToken)
            axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

            return response.data
        } catch (error) {
            throw error
        }
    }

    async function logout() {
        try {
            if (!import.meta.env.DEV) {
                await axios.post('/api/auth/logout')
            }
        } finally {
            token.value = null
            userId.value = null
            userRole.value = null
            userDetails.value = null
            localStorage.removeItem('authToken')
            delete axios.defaults.headers.common['Authorization']
            await router.push({ name: 'Login' })
        }
    }

    async function loadUser() {
        if (!token.value) { return }
        try {
            const response = await axios.get('/api/user/profile')
            const user = response.data.user
            userId.value = user.id
            userRole.value = user.role
            userDetails.value = user
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await logout();
            }
            throw error
        }
    }

    initDevMode()

    return {
        token,
        userId,
        userRole,
        userDetails,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        loadUser,
    }
})