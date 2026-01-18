<script setup>
import { ref, onMounted, watch } from 'vue'
import { authApi } from '@/api' // API direkt nutzen

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
    // API Aufruf (Backend muss das unterstützen)
    await authApi.forgotPassword(email.value)
    message.value = 'Falls diese E-Mail existiert, haben wir einen Link gesendet.'
  } catch (error) {
    // Aus Sicherheitsgründen zeigen wir oft trotzdem "Erfolg" an, 
    // aber zum Debuggen hier eine Fehlermeldung:
    errorMessage.value = 'Ein Fehler ist aufgetreten. Bitte versuche es später.'
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