<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { takeTokensFromHash } from '@/utils/tokenFromHash'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// decision Q9: the Google callback sends the tokens in the URL fragment
// (/auth-callback#token=…&refreshToken=…, M12); the store loads the user
// (M25: views reach the API only through stores, decision Q19)
onMounted(async () => {
  // the tokens must not stay in the address bar or the browser history
  const { token, refreshToken, challenge } = await takeTokensFromHash(route, router)

  // M32: with 2FA on, the login page asks for the code first
  if (challenge) {
    sessionStorage.setItem('twoFactorChallenge', challenge)
    router.push({ name: 'Login' })
    return
  }

  if (!token) {
    console.error('❌ Kein Token in Auth-Callback erhalten')
    router.push({ name: 'Login' })
    return
  }

  try {
    await authStore.completeGoogleSignIn({ token, refreshToken })
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
