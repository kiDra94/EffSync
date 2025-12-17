import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import router from '@/router'
import axios from 'axios' // For loadUser function, can be replaced with a userService when available

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('authToken'))
    const userId = ref(null)
    const userRole = ref(null)
    const userDetails = ref(null)

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => userRole.value === 'admin')

    function initDevMode() {
        if (import.meta.env.DEV) {
            token.value = localStorage.getItem('authToken') || 'dev-token-123'
            userId.value = 1
            userRole.value = localStorage.getItem('userRole') || 'admin'
            userDetails.value = {
                id: 1,
                username: 'devuser',
                role: 'admin'
            }
        }
    }

    async function login(credentials) {
        try {
            if (import.meta.env.DEV && credentials.username === 'dev') {
                initDevMode()
                return { token: token.value, user: userDetails.value }
            }

            const response = await authApi.login(credentials)
            const { token: newToken, user } = response.data

            token.value = newToken
            userId.value = user.id
            userRole.value = user.role
            userDetails.value = user

            localStorage.setItem('authToken', newToken)

            return response.data
        } catch (error) {
            throw error
        }
    }

    async function logout() {
        try {
            if (!import.meta.env.DEV) {
                await authApi.logout()
            }
        } finally {
            token.value = null
            userId.value = null
            userRole.value = null
            userDetails.value = null
            localStorage.removeItem('authToken')
            await router.push({ name: 'Login' })
        }
    }

    async function loadUser() { //TODO: adapt to userService.js (/api) when implemented
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
