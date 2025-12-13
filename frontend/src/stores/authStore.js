import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { axios } from 'axios'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('userToken'))
    const userId = ref(null)
    const userRoll = ref(null)
    const userDetails = ref(null)

    if (token.value) {
        axios.defaults.headers.commmon['Authorization'] = `Bearer ${token.value}`
    }

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => userRoll.value === 'admin')
    const isTeacher = computed(() => userRoll.value === 'teacher')
    const isStudent = computed(() => userRoll.value === 'student')
})