import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authService'
import router from '@/router'
import { useSocket } from './useSocket'
import { useSettingsStore } from './settingsStore'
import { useSearchStore } from './searchStore'
import { useAvatarStore } from './entities/avatarStore'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('authToken'))
    const userId = ref(Number(localStorage.getItem('userId')) || null)
    const userRole = ref(localStorage.getItem('userRole') || null)
    const userDetails = ref(null)
    // the URL of the own profile picture, null without one (M27)
    const profilePicture = ref(null)
    let pictureLoaded = false
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

    /**
     * The end of the Google sign-in (decision Q9, M12): the tokens came in
     * the URL fragment, the user comes from GET /auth/profile. On failure
     * both tokens are forgotten again.
     */
    async function completeGoogleSignIn({ token: newToken, refreshToken }) {
        // httpClient reads the token from localStorage for the profile request
        localStorage.setItem('authToken', newToken)
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken)
        } else {
            // never keep a previous session's refresh token next to this token
            localStorage.removeItem('refreshToken')
        }
        try {
            const { data: user } = await authApi.getAuthProfile()
            token.value = newToken
            userId.value = user.userId ?? user.id
            userRole.value = user.role || 'student'
            userDetails.value = user
            localStorage.setItem('userId', String(user.userId ?? user.id))
            localStorage.setItem('userRole', String(user.role || 'student'))
        } catch (error) {
            localStorage.removeItem('authToken')
            localStorage.removeItem('refreshToken')
            throw error
        }
    }

    // M25 (decision Q19): the views reach these API calls through the store
    const requestPasswordReset = (email) => authApi.forgotPassword(email)
    const setNewPassword = (password) => authApi.setNewPassword(password)
    const getTwoFactorStatus = async () => (await authApi.getTwoFactorStatus()).data
    const setupTwoFactor = async () => (await authApi.setupTwoFactor()).data
    const enableTwoFactor = (code) => authApi.enableTwoFactor(code)

    // T47 (M27): the change ends all sessions; this one gets new tokens
    async function changePassword(currentPassword, newPassword) {
        const { data } = await authApi.changePassword({
            current_password: currentPassword,
            new_password: newPassword,
        })
        token.value = data.token
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('refreshToken', data.refreshToken)
    }
    const disableTwoFactor = (code) => authApi.disableTwoFactor(code)

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
        // T68 (M25): the user's theme from the server, on every device
        await useSettingsStore().load();
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
            profilePicture.value = null
            pictureLoaded = false
            localStorage.removeItem('authToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('userId')
            localStorage.removeItem('userRole')
            await router.push({ name: 'Login' })
            const searchStore = useSearchStore()
            searchStore.reset()
            // review M25: the next user in this browser starts with the default
            useSettingsStore().reset()
            useAvatarStore().reset()
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
            // the same answer names the picture: no second request (review M27)
            profilePicture.value = user.profile_picture ?? null
            pictureLoaded = true
            localStorage.setItem('userRole', userRole.value || '')
            console.log('✅ Loaded userRole from profile:', userRole.value)
            connect(token.value);
        } catch (error) {
            console.error('Failed to load user profile:', error)
            await logout()
            throw error // Rethrow the error in case the UI needs to react
        }
    }

    /** The own profile picture, once per session (the header and the profile show it). */
    async function loadProfilePicture() {
        if (pictureLoaded || !token.value) return
        pictureLoaded = true
        try {
            const { data } = await authApi.getUserProfile()
            profilePicture.value = data?.profile_picture ?? null
        } catch (error) {
            // the initials stay; the next layout mount tries again
            pictureLoaded = false
            console.warn('Profilbild nicht geladen:', error?.message || error)
        }
    }

    async function uploadAvatar(file) {
        const { data } = await authApi.uploadAvatar(file)
        profilePicture.value = data.profile_picture
    }

    async function deleteAvatar() {
        await authApi.deleteAvatar()
        profilePicture.value = null
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
        profilePicture,
        loadProfilePicture,
        uploadAvatar,
        deleteAvatar,
        isAuthenticated,
        isAdmin,
        login,
        completeTwoFactorLogin,
        completeGoogleSignIn,
        requestPasswordReset,
        setNewPassword,
        getTwoFactorStatus,
        setupTwoFactor,
        enableTwoFactor,
        changePassword,
        disableTwoFactor,
        logout,
        loadUser,
        register,
    }
})
