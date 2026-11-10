<script setup>
import { API_URL } from '@/config/urls'
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const email = ref('')
const isLoading = ref(false)
const message = ref('')
const errorMessage = ref('')
const isDark = ref(false)


onMounted(() => { isDark.value = document.body.classList.contains('dark-mode') })
watch(isDark, (val) => document.body.classList.toggle("dark-mode", val))

const handleReset = async () => {
  isLoading.value = true
  errorMessage.value = ''
  message.value = ''
  
  try {
    await authStore.requestPasswordReset(email.value)
    message.value = 'Falls diese E-Mail existiert, haben wir einen Link gesendet.'
  } catch {
    errorMessage.value = 'Ein Fehler ist aufgetreten. Bitte versuche es später.'
  } finally {
    isLoading.value = false
  }
}

const handleGoogleReset = () => {
  window.location.href = `${API_URL}/auth/google/reset-password`
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
      <h2>Passwort vergessen?</h2>
      <p class="desc">Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.</p>

      <form @submit.prevent="handleReset">
        <div class="form-group">
          <label>E-Mail</label>
          <input type="email" v-model="email" required placeholder="Deine E-Mail" />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>
        <div v-if="message" class="success-msg">{{ message }}</div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '...' : 'Link anfordern' }}
        </button>

      </form>

      <div class="divider"><span>oder</span></div>

      <button class="google-btn" @click="handleGoogleReset" type="button">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Mit Google-Konto zurücksetzen
      </button>

      <div class="mt-3">
          <router-link :to="{ name: 'Login' }" class="link-text">Zurück zum Login</router-link>
      </div>
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
.divider { display: flex; align-items: center; margin: 1.2rem 0; color: #aaa; font-size: 0.85rem; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #ddd; }
.divider span { margin: 0 0.8rem; }
:global(body.dark-mode) .divider::before, :global(body.dark-mode) .divider::after { background: #444; }
.google-btn {
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;
  background: #fff; cursor: pointer; font-size: 0.95rem; color: #333;
  transition: background 0.2s, box-shadow 0.2s;
}
.google-btn:hover { background: #f5f5f5; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
:global(body.dark-mode) .google-btn { background: #2a2a2a; border-color: #444; color: #eee; }
:global(body.dark-mode) .google-btn:hover { background: #333; }
</style>