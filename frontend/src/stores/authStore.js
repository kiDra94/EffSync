import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { axios } from 'axios'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('userToken'))
    const userId = ref(null)
    const userRole = ref(null)
    const userDetails = ref(null)

    if (token.value) {
        axios.defaults.headers.commmon['Authorization'] = `Bearer ${token.value}`
    }

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => userRole.value === 'admin')
    const isTeacher = computed(() => userRole.value === 'teacher')
    const isStudent = computed(() => userRole.value === 'student')

    async function login(credentials) {
        try {
            const response = await axios.post('/api/auth/login', credentials)
            const { token: newToken, user } = response.data

            token.value = newToken
            userId.value = user.id
            userRole = user.role
            userDetails = user

            localStorage.setItem('userToken', newToken)
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
            localStorage.removeItem('userToken')
            delete axios.defaults.headers.commmon['Authorization']
        }
    }
})