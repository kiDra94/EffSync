<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  firstname: '',
  lastname: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: ''
})

const isLoading = ref(false)
const errorMessage = ref('')
const isDark = ref(false)

onMounted(() => { isDark.value = document.body.classList.contains('dark-mode') })
watch(isDark, (val) => document.body.classList.toggle("dark-mode", val))

const handleRegister = async () => {
  if (form.password !== form.password_confirmation) {
    errorMessage.value = 'Die Passwörter stimmen nicht überein.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const payload = {
        firstname: form.firstname,
        lastname: form.lastname,
        username: form.username,
        email: form.email,
        password: form.password
    }
    await authStore.register(payload)
    router.push({ name: 'Dashboard' })
  } catch (error) {
    if (error.response && error.response.data && error.response.data.errors) {
        const errors = Object.values(error.response.data.errors).flat()
        errorMessage.value = errors[0] || 'Registrierung fehlgeschlagen.'
    } else {
        errorMessage.value = 'Ein Fehler ist aufgetreten.'
        console.log('Registrierungsfehler:', error)
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
      <h2>Registrieren</h2>

      <form @submit.prevent="handleRegister">

        <div class="form-group">
          <label>Vorname</label>
          <input type="text" v-model="form.firstname" required placeholder="Vorname eingeben" />
        </div>

        <div class="form-group">
          <label>Nachname</label>
          <input type="text" v-model="form.lastname" required placeholder="Nachnamen eingeben" />
        </div>
        
        <div class="form-group">
          <label>Benutzername</label>
          <input type="text" v-model="form.username" required placeholder="Benutzername wählen" />
        </div>

        <div class="form-group">
          <label>E-Mail</label>
          <input type="email" v-model="form.email" required placeholder="beispiel@mail.com" />
        </div>

        <div class="form-group">
          <label>Passwort</label>
          <input type="password" v-model="form.password" required placeholder="Mind. 8 Zeichen" />
        </div>

        <div class="form-group">
          <label>Passwort bestätigen</label>
          <input type="password" v-model="form.password_confirmation" required placeholder="Passwort wiederholen" />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '...' : 'Konto erstellen' }}
        </button>

        <div class="login-footer">
            <span style="color:#666; margin-right:5px">Bereits ein Konto?</span>
            <router-link :to="{ name: 'Login' }" class="link-text">Anmelden</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Leer, da style.css übernimmt */
</style>