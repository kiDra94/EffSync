<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '@/api/authService'

// T31, FA-06 (M32): 2FA with an authenticator app; the password card is
// still static
const twoFactorEnabled = ref(false)
const setup = ref(null) // { secret, qr_code } while the setup waits for its code
const code = ref('')
const message = ref('')
const busy = ref(false)

const errorText = (error) => {
  const backendMessage = error.response?.data?.message
  if (Array.isArray(backendMessage)) return backendMessage.join(' ')
  return backendMessage || 'Ein Fehler ist aufgetreten.'
}

const run = async (action) => {
  busy.value = true
  message.value = ''
  try {
    await action()
  } catch (error) {
    message.value = errorText(error)
  } finally {
    busy.value = false
  }
}

onMounted(() =>
  run(async () => {
    twoFactorEnabled.value = (await authApi.getTwoFactorStatus()).data.enabled
  }),
)

const startSetup = () =>
  run(async () => {
    setup.value = (await authApi.setupTwoFactor()).data
    code.value = ''
  })

const confirmSetup = () =>
  run(async () => {
    await authApi.enableTwoFactor(code.value)
    twoFactorEnabled.value = true
    setup.value = null
    code.value = ''
  })

const disable = () =>
  run(async () => {
    await authApi.disableTwoFactor(code.value)
    twoFactorEnabled.value = false
    code.value = ''
  })
</script>

<template>
  <div class="content-section">
    <!-- Change password -->
    <div class="security-card">
      <h2>Passwort ändern</h2>
      <form class="security-form">
        <div class="form-group">
          <label>Aktuelles Passwort</label>
          <input type="password" class="form-input" placeholder="••••••••" />
        </div>
        <div class="form-group">
          <label>Neues Passwort</label>
          <input type="password" class="form-input" placeholder="••••••••" />
        </div>
        <div class="form-group">
          <label>Passwort bestätigen</label>
          <input type="password" class="form-input" placeholder="••••••••" />
        </div>
        <button type="button" class="btn-secondary">Passwort ändern</button>
      </form>
    </div>

    <!-- 2FA (M32) -->
    <div class="security-card">
      <h2>Zwei-Faktor-Authentifizierung</h2>

      <template v-if="twoFactorEnabled">
        <p>✅ 2FA ist aktiv: Bei der Anmeldung wird ein Code aus Ihrer Authenticator-App abgefragt.</p>
        <div class="form-group">
          <label>Code zum Deaktivieren</label>
          <input v-model="code" class="form-input code-input" inputmode="numeric" maxlength="6"
            placeholder="123456" autocomplete="one-time-code" />
        </div>
        <button type="button" class="btn-secondary" :disabled="busy || code.length !== 6" @click="disable">
          2FA deaktivieren
        </button>
      </template>

      <template v-else-if="setup">
        <p>Scannen Sie den QR-Code mit einer Authenticator-App (z. B. Google Authenticator) und geben Sie den angezeigten Code ein.</p>
        <img class="qr-code" :src="setup.qr_code" alt="QR-Code für die Authenticator-App" />
        <p class="secret">Manuell: <code>{{ setup.secret }}</code></p>
        <div class="form-group">
          <label>Bestätigungscode</label>
          <input v-model="code" class="form-input code-input" inputmode="numeric" maxlength="6"
            placeholder="123456" autocomplete="one-time-code" />
        </div>
        <button type="button" class="btn-secondary" :disabled="busy || code.length !== 6" @click="confirmSetup">
          Bestätigen
        </button>
      </template>

      <template v-else>
        <p>Sichern Sie Ihr Konto mit 2FA.</p>
        <button type="button" class="btn-secondary" :disabled="busy" @click="startSetup">2FA aktivieren</button>
      </template>

      <p v-if="message" class="error-msg" role="alert">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.security-card {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.security-card h2 {
  margin: 0 0 12px;
  color: #1f2937;
}

.security-card p {
  margin: 0 0 12px;
  color: #6b7280;
}

.security-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.btn-secondary {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #1f2937;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.qr-code {
  display: block;
  width: 200px;
  height: 200px;
  margin: 0 0 12px;
  background: white;
}

.secret code {
  word-break: break-all;
}

.code-input {
  max-width: 12rem;
  letter-spacing: 0.2em;
}

.security-card .form-group {
  margin-bottom: 12px;
}

.security-card .error-msg {
  margin: 12px 0 0;
  color: #b91c1c;
}
</style>

<style>
body.dark-mode .security-card {
  background-color: #232330 !important;
  border-color: #444 !important;
  color: #ddd !important;
}

body.dark-mode .security-card h2 {
  color: white !important;
}

body.dark-mode .security-card p {
  color: #999 !important;
}

body.dark-mode .form-group label {
  color: white !important;
}

body.dark-mode .form-input {
  background-color: #1a1a23 !important;
  color: #e0e0e0 !important;
  border-color: #444 !important;
}

body.dark-mode .btn-secondary {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: white !important;
}

body.dark-mode .btn-secondary:hover {
  background-color: #4b4b6a !important;
}

body.dark-mode .security-section,
.app-container.dark-mode .security-section {
  background: #2a2f45 !important;
  border-color: #434963 !important;
}

body.dark-mode .security-card,
.app-container.dark-mode .security-card {
  background: #2a2f45 !important;
  border-color: #434963 !important;
}

body.dark-mode .security-card h2,
.app-container.dark-mode .security-card h2 {
  color: #edf0fa !important;
}

body.dark-mode .security-card p,
.app-container.dark-mode .security-card p {
  color: #b2b9cb !important;
}

body.dark-mode .form-group label,
.app-container.dark-mode .form-group label {
  color: #b2b9cb !important;
}

body.dark-mode .form-input,
.app-container.dark-mode .form-input {
  background: #31364d !important;
  border-color: #434963 !important;
  color: #edf0fa !important;
}
</style>
