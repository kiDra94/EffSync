<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/authService'
import { takeTokenFromHash } from '@/utils/tokenFromHash'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// decision Q9: the Google callback sends the token in the URL fragment
// (/auth-callback#token=…); the user comes from GET /auth/profile
onMounted(async () => {
  // the token must not stay in the address bar or the browser history
  const token = await takeTokenFromHash(route, router)

  if (!token) {
    console.error('❌ Kein Token in Auth-Callback erhalten')
    router.push({ name: 'Login' })
    return
  }

  try {
    // httpClient reads the token from localStorage for the profile request
    localStorage.setItem('authToken', token)
    const { data: user } = await authApi.getAuthProfile()

    authStore.token = token
    authStore.userId = user.userId ?? user.id
    authStore.userRole = user.role || 'student'
    authStore.userDetails = user

    localStorage.setItem('userId', String(user.userId ?? user.id))
    localStorage.setItem('userRole', String(user.role || 'student'))

    router.push({ name: 'Dashboard' })
  } catch (error) {
    console.error('❌ Fehler beim Verarbeiten des Auth-Callbacks:', error)
    localStorage.removeItem('authToken')
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
