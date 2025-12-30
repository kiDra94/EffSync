<template>
  <div class="auth-container" :class="{ 'dark-mode': isDark }">
    <div class="auth-card">
      <h2>Account erstellen</h2>
      <p>Registriere dich, um die Services zu nutzen.</p>
      
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Name</label>
          <input type="text" v-model="form.name" placeholder="Dein Name" required />
        </div>
        <div class="form-group">
          <label>E-Mail</label>
          <input type="email" v-model="form.email" placeholder="beispiel@mail.com" required />
        </div>
        <div class="form-group">
          <label>Passwort</label>
          <input type="password" v-model="form.password" placeholder="••••••••" required />
        </div>
        
        <button type="submit" class="btn-primary">Registrieren</button>
      </form>
      
      <p class="footer-text">
        Bereits ein Konto? <router-link to="/login">Hier anmelden</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// isDark sollte idealerweise aus einem globalen Store (Pinia) kommen
const isDark = ref(false); 
const form = ref({ name: '', email: '', password: '' });

const handleRegister = () => {
  console.log("Registrierung mit:", form.value);
  // Hier API Call einfügen
};
</script>

<style scoped>
@import "@/assets/css/auth.css"; /* Gemeinsame Styles siehe unten */
.auth-card { border-top: 5px solid #a89df1; } /* Farbe der Home-Card */
</style>