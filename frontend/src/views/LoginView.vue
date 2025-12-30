<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const credentials = reactive({ username: '', password: '' })
const errorMessage = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await authStore.login(credentials)
    router.push({ name: 'Dashboard' }) 
  } catch (error) {
    if (error.response && error.response.status === 401) {
      errorMessage.value = 'Ungültige Zugangsdaten.'
    } else {
      errorMessage.value = 'Ein Fehler ist aufgetreten.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="logo"><strong>EffSync</strong></div>
      <h2>Anmelden</h2>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Benutzername</label>
          <input type="text" v-model="credentials.username" required placeholder="Benutzername" />
        </div>

        <div class="form-group">
          <label>Passwort</label>
          <input type="password" v-model="credentials.password" required placeholder="Passwort" />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Nutzt deine Farbpalette */
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f4f4f9; /* Light Mode BG */
}

/* Für Dark Mode Support falls global aktiviert */
:global(body.dark-mode) .login-wrapper {
    background-color: #1e1e2f;
}

.login-card {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

:global(body.dark-mode) .login-card {
    background-color: #2c2c3e;
    color: #ddd;
}

.logo {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #23234c; /* Deine Sidebar Farbe als Akzent */
}

:global(body.dark-mode) .logo {
    color: #fff;
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
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-sizing: border-box;
}

:global(body.dark-mode) input {
    background-color: #1e1e2f;
    border: 1px solid #444;
    color: white;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #23234c; /* Deine Hauptfarbe */
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

button:hover {
  background-color: #2c2c3e;
}

.error-msg {
  color: #e74c3c;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
</style>