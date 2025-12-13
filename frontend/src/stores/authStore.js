import { defineStore } from 'pinia'
import { ref, computedd } from 'vue'
import { axios } from 'axios'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('userToken'))
    const userId = ref(null)
    const userRoll = ref(null)
    const userDetails = ref(null)

    
})