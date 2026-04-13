import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authService'
import router from '@/router'
import { useSocket } from './useSocket'
import { useSearchStore } from './searchStore'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('authToken'))
    const userId = ref(Number(localStorage.getItem('userId')) || null)
    const userRole = ref(localStorage.getItem('userRole') || null)
    const userDetails = ref(null)
    const { connect, disconnect } = useSocket();

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => ['admin', 'superuser'].includes(userRole.value))
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

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
            connect(token.value);
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
            const data = response.data;
            const newToken = data.token;
            const user = data.user || data;

            // Debug logging
            console.log('📝 Login Response Data:', data)
            console.log('👤 User from response:', user)
            console.log('🔐 User role from response:', user.role)

            token.value = newToken
            userId.value = user.user_id ?? user.id ?? null
            userRole.value = user.role ? user.role.toLowerCase() : null
            userDetails.value = user

            localStorage.setItem('authToken', newToken)
            localStorage.setItem('userId', userId.value)
            localStorage.setItem('userRole', userRole.value || '')

            console.log('✅ Stored userRole in authStore:', userRole.value)

            connect(data.token);
            try {
                const searchStore = useSearchStore();
                await searchStore.ensureLoaded();
            } catch (e) {
                console.warn('SearchStore Fehler (nicht kritisch):', e.message);
            }
            

            return response.data
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }

    async function logout() {
        try {
            if (!isDevMode) {
                await authApi.logout()
            }
        } catch (error) {
            console.error('Logout failed:', error)
        } finally {
            disconnect();
            token.value = null
            userId.value = null
            userRole.value = null
            userDetails.value = null
            localStorage.removeItem('authToken')
            localStorage.removeItem('userId')
            localStorage.removeItem('userRole')
            await router.push({ name: 'Login' })
            const searchStore = useSearchStore()
            searchStore.reset()
        }
    }

    async function loadUser() {
        if (!token.value) { return }
        try {
            if (isDevMode) {
                console.log('Dev-Mode: loadUser() übersprungen')
                return
            }
            const response = await authApi.getUserProfile()
            // Anpassung je nach Backend-Antwortstruktur (oft response.data oder response.data.user)
            const user = response.data.user || response.data
            console.log('📋 Full Response:', JSON.stringify(response, null, 2))
            console.log('📋 LoadUser Response:', user)
            console.log('🔐 User role from profile:', user.role)
            console.log('🔐 User object keys:', Object.keys(user))
            
            userId.value = user.user_id || user.id
            userRole.value = user.role ? user.role.toLowerCase() : null
            userDetails.value = user
            localStorage.setItem('userRole', userRole.value || '')
            console.log('✅ Loaded userRole from profile:', userRole.value)
            connect(token.value);
        } catch (error) {
            console.error('Failed to load user profile:', error)
            await logout()
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
