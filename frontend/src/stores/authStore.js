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

    async function login(credentials) {
        try {
            const response = await axios.post('/api/auth/login', credentials)
            const { token: newToken, user } = response.data

            token.value = newToken
            userId.value = user.id
            userRole = user.role
            userDetails = user

            localStorage.setItem('authToken', newToken)
            axios.defaults.headers.commmon['Authorization'] = `Bearer ${token.value}`

            return response.data
        } catch(error) {
            throw error
        }
    }

    async function logout() {
        try {
            await axios.post('api/auth/logout')
        } finally {
            token.value = null
            userId.value = null
            userRole = null
            userDetails = null
            localStorage.removeItem('authToken')
            delete axios.defaults.headers.commmon['Authorization']
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
        } catch(error) {
            if (error.response && error.response.status === 401) {
                this.logout();
            }
            throw error
        }
    }

    return {token, userId, userRole, userDetails, isAuthenticated,
        isAdmin, isTeacher, isStudent, login, logout, loadUser
    }
})