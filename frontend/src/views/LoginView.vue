<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const credentials = reactive({ username: '', password: '' })
const errorMessage = ref('')
const isLoading = ref(false)

// Dark Mode Status
const isDark = ref(false)

onMounted(() => {
  // Beim Laden prüfen, ob DarkMode schon an ist
  isDark.value = document.body.classList.contains('dark-mode')
})

watch(isDark, (val) => {
  document.body.classList.toggle("dark-mode", val);
});

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
    
    <div class="top-right-actions">
        <label class="switch-label">
            <input type="checkbox" class="checkbox" v-model="isDark" />
            <span class="slider"></span>
        </label>
    </div>

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
/* Nur Layout & Basis-Styling hier */
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
    background-color: #f4f4f9; /* Standard Hell */
    transition: background-color 0.3s;
}

.login-card {
    background-color: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
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
.checkbox { display: none; }
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
.checkbox:checked ~ .slider { background-color: #d8dbe0; }
.checkbox:checked ~ .slider::before {
    transform: translateX(28px);
    background-color: #28292c;
}
</style>