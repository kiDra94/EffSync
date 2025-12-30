<script setup>
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const router = useRouter();
const isDark = ref(false);

// Dark Mode Logic: Setzt die Klasse direkt auf den Body
watch(isDark, (val) => {
  document.body.classList.toggle("dark-mode", val);
});

// Logout
const handleLogout = async () => {
  await authStore.logout();
};

const userInitial = computed(() => {
    return authStore.userDetails?.username ? authStore.userDetails.username[0].toUpperCase() : 'U';
});
</script>

<template>
  <div :class="{ 'dark-mode': isDark }" class="app-container">
    
    <div class="sidebar">
      <router-link :to="{ name: 'Dashboard' }" title="Dashboard">🏠</router-link>
      <router-link :to="{ name: 'Calendar' }" title="Kalender">🗓️</router-link>
      <router-link :to="{ name: 'DocumentList' }" title="Dokumente">📂</router-link>
      <router-link :to="{ name: 'ClassList' }" title="Klassen">🏢</router-link>
      <router-link :to="{ name: 'TaskList' }" title="Aufgaben">📋</router-link>
      <router-link :to="{ name: 'NoteLists' }" title="Notizen">📝</router-link>
    </div>

    <div class="main-wrapper">
      
      <div class="header">
        <div class="logo"><strong>EffSync</strong></div>

        <input type="search" placeholder="Search..." />

        <div class="header-actions">
            <div class="user-menu">
                <div class="avatar" @click="handleLogout" title="Logout">
                    {{ userInitial }}
                </div>
            </div>

            <label class="switch-label">
                <input type="checkbox" class="checkbox" v-model="isDark" />
                <span class="slider"></span>
            </label>
        </div>
      </div>

      <div class="content">
        <router-view v-slot="{ Component }">
             <component :is="Component" />
        </router-view>
      </div>
    </div>
  </div>
</template>

<style>
/* Wenn der Body die Klasse "dark-mode" hat, ändere den Header */
body.dark-mode .header {
  background-color: #2c2c3e !important; /* !important erzwingt die Farbe */
  border-bottom: 1px solid #444 !important;
  color: #ddd !important;
}

body.dark-mode .header .logo {
    color: white !important;
}

body.dark-mode .header input[type="search"] {
    background-color: #1e1e2f !important;
    border: 1px solid #444 !important;
    color: white !important;
}

/* Scrollbar dunkel machen (optional) */
body.dark-mode ::-webkit-scrollbar-track {
    background: #1e1e2f;
}
body.dark-mode ::-webkit-scrollbar-thumb {
    background: #444; 
}
</style>

<style scoped>
/* layout */
.app-container {
  display: flex;
  height: 100vh;
  background-color: #f4f4f9; /* Standard Hell */
  transition: background-color 0.3s;
}

/* --- HIER IST DER FIX --- */
/* Wenn der Container die Klasse dark-mode hat (durch isDark), wird er dunkel */
.app-container.dark-mode {
  background-color: #1e1e2f;
  color: #ddd;
}

/* Sidebar */
.sidebar {
  width: 80px;
  background-color: #23234c;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  flex-shrink: 0;
}

.sidebar a {
  color: white;
  text-decoration: none;
  margin: 20px 0;
  font-size: 22px;
  transition: transform 0.2s;
}

.sidebar a:hover {
    transform: scale(1.2);
}

.sidebar a.router-link-active {
    border-bottom: 2px solid white;
}

/* Header */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background-color: white;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ddd;
  transition: background-color 0.3s, border-color 0.3s;
}

.header input[type="search"] {
  padding: 5px 10px;
  width: 300px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* User Avatar */
.avatar {
    width: 35px;
    height: 35px;
    background-color: #23234c;
    color: white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    cursor: pointer;
}

/* Toggle Switch */
.switch-label {
  position: relative;
  width: 60px;
  height: 30px;
  background-color: #28292c;
  border-radius: 25px;
  cursor: pointer;
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

.checkbox:checked ~ .slider {
  background-color: #d8dbe0;
}

.checkbox:checked ~ .slider::before {
  transform: translateX(28px);
  background-color: #28292c;
}

.content {
  padding: 20px 30px;
  overflow-y: auto;
  flex: 1;
}
</style>