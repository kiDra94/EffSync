<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

// identifier: username or e-mail address (T49)
const credentials = reactive({ identifier: '', password: '' })
const errorMessage = ref('')
const isLoading = ref(false)
// UC-01b (M32): after the password, the code of the authenticator app
const challengeToken = ref(null)
const code = ref('')

// Dark mode state
const isDark = ref(false)

onMounted(() => {
  // On load, check whether dark mode is already on
  isDark.value = document.body.classList.contains('dark-mode')
  // M32: a 2FA user coming back from the Google sign-in enters the code here
  const fromGoogle = sessionStorage.getItem('twoFactorChallenge')
  if (fromGoogle) {
    sessionStorage.removeItem('twoFactorChallenge')
    challengeToken.value = fromGoogle
  }
})

watch(isDark, (val) => {
  document.body.classList.toggle("dark-mode", val);
});

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const result = await authStore.login(credentials)
    if (result?.twoFactorRequired) {
      challengeToken.value = result.challengeToken
      return
    }
    router.push({ name: 'Dashboard' })
  } catch (error) {
    const status = error.response?.status
    const backendMessage = error.response?.data?.message

    if (status === 401) {
      errorMessage.value = 'Ungültige Zugangsdaten.'
    } else if (status === 429) {
      errorMessage.value = 'Zu viele Versuche. Bitte warte 1 Minute.'
    } else if (status === 400) {
      if (Array.isArray(backendMessage)) {
        errorMessage.value = backendMessage.join(' ')
      } else if (typeof backendMessage === 'string' && backendMessage.length > 0) {
        errorMessage.value = backendMessage
      } else {
        errorMessage.value = 'Eingaben sind ungültig.'
      }
    } else {
      errorMessage.value = 'Ein Fehler ist aufgetreten.'
    }
  } finally {
    isLoading.value = false
  }
}

const handleTwoFactor = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await authStore.completeTwoFactorLogin(challengeToken.value, code.value)
    router.push({ name: 'Dashboard' })
  } catch (error) {
    const status = error.response?.status
    if (status === 401) {
      errorMessage.value = 'Ungültiger oder abgelaufener Code.'
    } else if (status === 429) {
      errorMessage.value = 'Zu viele Versuche. Bitte warte 1 Minute.'
    } else if (status === 400) {
      errorMessage.value = 'Der Code hat 6 Ziffern.'
    } else {
      // httpClient turns a 429 into an Error with its own message
      errorMessage.value = (!error.response && error.message) || 'Ein Fehler ist aufgetreten.'
    }
    code.value = ''
  } finally {
    isLoading.value = false
  }
}

// back to the password, e.g. when the challenge expired (5 minutes)
const backToPassword = () => {
  challengeToken.value = null
  code.value = ''
  errorMessage.value = ''
}

const handleGoogleLogin = () => {
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  window.location.href = `${backendUrl}/auth/google`
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
      <h2>Anmelden</h2>

      <form v-if="challengeToken" @submit.prevent="handleTwoFactor">
        <p class="two-factor-hint">Gib den 6-stelligen Code aus deiner Authenticator-App ein.</p>
        <div class="form-group">
          <label>Bestätigungscode</label>
          <input type="text" v-model="code" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
            placeholder="123456" autocomplete="one-time-code" />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '...' : 'Bestätigen' }}
        </button>

        <div class="login-footer">
          <a href="#" class="link-text" @click.prevent="backToPassword">Zurück zur Anmeldung</a>
        </div>
      </form>

      <form v-else @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Benutzername oder E-Mail</label>

          <input type="text" v-model="credentials.identifier" required minlength="3" maxlength="254"
            placeholder="Benutzername oder E-Mail" autocomplete="username" />
        </div>

        <div class="form-group">
          <label>Passwort</label>
          <input type="password" v-model="credentials.password" required maxlength="128"
            placeholder="Passwort" />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '...' : 'Login' }}
        </button>

        <div class="divider-line">
          <span>oder</span>
        </div>

        <button type="button" @click="handleGoogleLogin" class="btn-google">
          🔒 Mit Google anmelden
        </button>

        <div class="login-footer">
          <router-link :to="{ name: 'ForgotPassword' }" class="link-text">Passwort vergessen? </router-link>
          <span class="divider">|</span>
          <router-link :to="{ name: 'Register' }" class="link-text"> Konto erstellen</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Only layout & base styling here */
.two-factor-hint {
  margin: 0 0 1rem;
  color: #6b7280;
}

.top-right-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f4f4f9;
  /* Default light */
  transition: background-color 0.3s;
}

.login-card {
  background-color: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 400px;
  text-align: center;
  transition: background-color 0.3s, color 0.3s;
}

.logo {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #23234c;
  font-weight: bold;
}

.form-group {
  margin-bottom: 1.2rem;
  text-align: left;
}

label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #555;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #23234c;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 1rem;
}

button:hover {
  background-color: #343458;
}

.error-msg {
  color: #e74c3c;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.divider-line {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: #999;
}

.divider-line::before,
.divider-line::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: #ddd;
}

.btn-google {
  background-color: #ffffff;
  color: #333;
  border: 1px solid #ddd;
  padding: 12px;
  margin-bottom: 1rem;
}

.btn-google:hover {
  background-color: #f9f9f9;
  border-color: #ccc;
}

/* Dark mode for the Google button */
:global(body.dark-mode) .btn-google {
  background-color: #31364d;
  color: #edf0fa;
  border-color: #434963;
}

:global(body.dark-mode) .btn-google:hover {
  background-color: #3a4060;
  border-color: #555;
}

:global(body.dark-mode) .divider-line {
  color: #7a8199;
}

:global(body.dark-mode) .divider-line::before,
:global(body.dark-mode) .divider-line::after {
  background-color: #434963;
}

/* Switch Styles */
.switch-label {
  position: relative;
  width: 60px;
  height: 30px;
  background-color: #28292c;
  border-radius: 25px;
  cursor: pointer;
  margin: 0;
}

.checkbox {
  display: none;
}

.slider {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 25px;
  transition: 0.3s;
}

.slider::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #d8dbe0;
  transition: 0.3s;
}

.checkbox:checked~.slider {
  background-color: #d8dbe0;
}

.checkbox:checked~.slider::before {
  transform: translateX(28px);
  background-color: #28292c;
}

.login-footer {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 10px;
  font-size: 0.9rem;
}

.link-text {
  color: #555;
  text-decoration: none;
  transition: color 0.2s;
}

.link-text:hover {
  color: #23234c;
  text-decoration: underline;
}

.divider {
  color: #ccc;
}

/* Dark mode adjustment for links */
:global(body.dark-mode) .link-text {
  color: #aaa;
}

:global(body.dark-mode) .link-text:hover {
  color: #fff;
}

:global(body.dark-mode) .divider {
  color: #555;
}
</style>
