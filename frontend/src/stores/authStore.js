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
            if (isDevMode && credentials.identifier === import.meta.env.VITE_DEV_USERNAME) {
                initDevMode()
                console.log('Dev mode login successful:')
                return { token: token.value, user: userDetails.value }
            }

            const response = await authApi.login(credentials)
            const data = response.data;
            // UC-01b (M32): with 2FA on, the session waits for the code
            if (data.two_factor_required) {
                return { twoFactorRequired: true, challengeToken: data.challenge_token }
            }
            await startSession(data)
            return response.data
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }

    // the login's second step (M32): the code turns the challenge into tokens
    async function completeTwoFactorLogin(challengeToken, code) {
        const response = await authApi.verifyTwoFactor({ challenge_token: challengeToken, code })
        await startSession(response.data)
        return response.data
    }

    // stores the tokens and the user of a finished login and connects
    async function startSession(data) {
        const newToken = data.token;
        const user = data.user || data;

        token.value = newToken
        userId.value = user.user_id ?? user.id ?? null
        userRole.value = user.role ? user.role.toLowerCase() : null
        userDetails.value = user

        localStorage.setItem('authToken', newToken)
        // T51 (M12): httpClient renews the 15-minute access token with it
        if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken)
        } else {
            // never keep a previous session's refresh token next to this token
            localStorage.removeItem('refreshToken')
        }
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
    }

    async function logout() {
        try {
            // T123 (M12): revokes only this session; other devices stay signed in
            const refreshToken = localStorage.getItem('refreshToken')
            if (!isDevMode && refreshToken) {
                await authApi.logout(refreshToken)
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
            localStorage.removeItem('refreshToken')
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
            // Adjust to the backend's response shape (often response.data or response.data.user)
            const user = response.data.user || response.data
            
            userId.value = user.user_id || user.id
            userRole.value = user.role ? user.role.toLowerCase() : null
            userDetails.value = user
            localStorage.setItem('userRole', userRole.value || '')
            console.log('✅ Loaded userRole from profile:', userRole.value)
            connect(token.value);
        } catch (error) {
            console.error('Failed to load user profile:', error)
            await logout()
            throw error // Rethrow the error in case the UI needs to react
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
        completeTwoFactorLogin,
        logout,
        loadUser,
        register,
    }
})
