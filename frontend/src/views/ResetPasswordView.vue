<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/authService'
import { useAuthStore } from '@/stores/authStore'
import { takeTokenFromHash } from '@/utils/tokenFromHash'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const passwordConfirm = ref('')
const isLoading = ref(false)
const message = ref('')
const errorMessage = ref('')
const isDark = ref(false)
const token = ref(null)

onMounted(async () => {
  isDark.value = document.body.classList.contains('dark-mode')
  // the Google reset callback sends the token in the URL fragment (decision Q9)
  token.value = await takeTokenFromHash(route, router)
  if (!token.value) {
    errorMessage.value = 'Ungültiger oder abgelaufener Link. Bitte starte den Vorgang erneut.'
  } else {
    // Put the token into the store and localStorage so authApi calls work
    authStore.token = token.value
    localStorage.setItem('authToken', token.value)
  }
})
watch(isDark, (val) => document.body.classList.toggle('dark-mode', val))

const handleSubmit = async () => {
  errorMessage.value = ''
  message.value = ''

  if (password.value.length < 6) {
    errorMessage.value = 'Passwort muss mindestens 6 Zeichen lang sein.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = 'Passwörter stimmen nicht überein.'
    return
  }

  isLoading.value = true
  try {
    await authApi.setNewPassword(password.value)
    message.value = 'Passwort erfolgreich geändert! Du wirst zum Login weitergeleitet...'
    authStore.logout()
    setTimeout(() => router.push({ name: 'Login' }), 2500)
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'Fehler beim Ändern des Passworts.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="top-right-actions">
      <label class="switch-label">
        <input type="checkbox" class="checkbox" v-model="isDark" />
        <span class="slider"></span>
      </label>
    </div>

    <div class="login-card">
      <div class="logo"><strong>EffSync</strong></div>
      <h2>Neues Passwort setzen</h2>
      <p class="desc">Deine Identität wurde über Google bestätigt. Lege jetzt ein neues Passwort fest.</p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Neues Passwort</label>
          <input
            type="password"
            v-model="password"
            required
            placeholder="Mindestens 6 Zeichen"
            :disabled="!token"
          />
        </div>
        <div class="form-group">
          <label>Passwort bestätigen</label>
          <input
            type="password"
            v-model="passwordConfirm"
            required
            placeholder="Passwort wiederholen"
            :disabled="!token"
          />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>
        <div v-if="message" class="success-msg">{{ message }}</div>

        <button type="submit" :disabled="isLoading || !token">
          {{ isLoading ? '...' : 'Passwort speichern' }}
        </button>

        <div class="mt-3">
          <router-link :to="{ name: 'Login' }" class="link-text">Zurück zum Login</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.top-right-actions { position: absolute; top: 20px; right: 20px; z-index: 10; }
.form-group { margin-bottom: 1.2rem; text-align: left; }
.desc { font-size: 0.9rem; color: #666; margin-bottom: 1.5rem; }
:global(body.dark-mode) .desc { color: #aaa; }
.mt-3 { margin-top: 1rem; }
.link-text { color: #666; text-decoration: none; font-size: 0.9rem; }
.link-text:hover { text-decoration: underline; color: #23234c; }
:global(body.dark-mode) .link-text { color: #aaa; }
:global(body.dark-mode) .link-text:hover { color: #fff; }
.success-msg { color: #27ae60; margin-bottom: 1rem; font-size: 0.9rem; }
.error-msg { color: #e74c3c; margin-bottom: 1rem; font-size: 0.9rem; }
</style>
