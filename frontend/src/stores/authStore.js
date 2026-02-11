import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authService'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('authToken'))
    const userId = ref(null)
    const userRole = ref(null)
    const userDetails = ref(null)

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => userRole.value === 'admin')
    const isDevMode = import.meta.env.DEV === 'true';

    function initDevMode() {
        if (isDevMode) {
            token.value = localStorage.getItem('authToken') || import.meta.env.VITE_DEV_TOKEN
            userId.value = 1
            userRole.value = localStorage.getItem('userRole') || import.meta.env.VITE_DEV_ROLE
            userDetails.value = {
                id: 1,
                username: import.meta.env.VITE_DEV_USERNAME || 'devuser',
                role: import.meta.env.VITE_DEV_ROLE || 'admin'
            }
        }
    }

    async function login(credentials) {
        try {
            if (isDevMode && credentials.username === import.meta.env.VITE_DEV_USERNAME) {
                initDevMode()
                console.log('Dev mode login successful:')
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
            console.error('Login failed:', error)
        }
    }

    async function logout() {
        try {
            if (!isDevMode) {
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

   async function loadUser() { 
        if (!token.value) { return }
        try {
            if (isDevMode) {
                console.log('Dev-Mode: loadUser() übersprungen')
                return
            }
            // Nutzt jetzt die zentralisierte authApi (löst das TODO)
            const response = await authApi.getUserProfile()
            
            // Anpassung je nach Backend-Antwortstruktur (oft response.data oder response.data.user)
            const user = response.data.user || response.data
            
            userId.value = user.id
            userRole.value = user.role
            userDetails.value = user
        } catch (error) {
            // Wenn Token ungültig (401), logge den User aus
            if (error.response && error.response.status === 401) {
                await logout();
            }
            throw error // Fehler weiterwerfen, falls die UI darauf reagieren soll
        }
    }

    async function register(userData) {
        try {
            const response = await authApi.register(userData)
            return response.data
        } catch (error) {
            console.error('Registration failed:', error)
            throw error
        }
    }

    if (isDevMode) {
        console.log('Dev mode aktiviert: Automatischer Login mit Dev-Token')
        initDevMode()
    }
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
        register,
    }
})
