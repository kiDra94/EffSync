<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  const token = route.query.token
  const userJson = route.query.user

  if (!token) {
    console.error('❌ Kein Token in Auth-Callback erhalten')
    router.push({ name: 'Login' })
    return
  }

  try {
    // Parse user data from query param
    const user = userJson ? JSON.parse(decodeURIComponent(userJson)) : {}

    // Update auth store directly (these are refs)
    authStore.token = token
    authStore.userId = user.userId || user.id
    authStore.userRole = user.role || 'student'
    authStore.userDetails = user

    // Also save to localStorage
    localStorage.setItem('authToken', token)
    localStorage.setItem('userId', String(user.userId || user.id))
    localStorage.setItem('userRole', String(user.role || 'student'))

    console.log('✅ Google OAuth erfolgreich!')
    console.log('👤 User:', user)
    
    // Give a moment for reactivity to update
    await new Promise(resolve => setTimeout(resolve, 500))
    
    router.push({ name: 'Dashboard' })
  } catch (error) {
    console.error('❌ Fehler beim Verarbeiten des Auth-Callbacks:', error)
    router.push({ name: 'Login' })
  }
})
</script>

<template>
  <div class="auth-callback">
    <div class="loader"></div>
    <p>Authentifizierung wird verarbeitet...</p>
  </div>
</template>

<style scoped>
.auth-callback {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

p {
  color: white;
  font-size: 1.1rem;
  margin-top: 20px;
}

.loader {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
