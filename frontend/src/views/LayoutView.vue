<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useSearchStore } from "@/stores/searchStore";

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const searchStore = useSearchStore();  // ← neu
const router = useRouter();
const isDark = ref(false);
const showDropdown = ref(false); // Neuer State für das Menü
const showResults = ref(false);

// Dark Mode Logic
watch(isDark, (val) => {
  document.body.classList.toggle("dark-mode", val);
  localStorage.setItem('theme', val ? 'dark' : 'light');
});

// Click Outside Logic: Schließt das Menü, wenn man woanders klickt
const closeDropdown = (e) => {
  // Wenn der Klick NICHT innerhalb des User-Menüs war, schließen
  if (!e.target.closest('.user-menu')) {
    showDropdown.value = false;
  }
}

const closeSearch = (e) => {
  if (!e.target.closest('.search-wrapper')) {
    showResults.value = false;
  }
};

onMounted(() => {
  // Restore theme preference reliably across reloads/views
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    isDark.value = savedTheme === 'dark';
  } else {
    isDark.value = document.body.classList.contains('dark-mode');
  }
  document.body.classList.toggle('dark-mode', isDark.value);

  window.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown)
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
}

const handleLogout = async () => {
  await authStore.logout();
  showDropdown.value = false;
};

const userInitial = computed(() => {
  return authStore.userDetails?.username ? authStore.userDetails.username[0].toUpperCase() : 'U';
});

const onSearchFocus = async () => {
  showResults.value = true;
  await searchStore.ensureLoaded();
};

const onSearchInput = () => {
  showResults.value = true;
};

const navigateToResult = (result) => {
  showResults.value = false;
  searchStore.reset();
  const routeMap = {
    task: { name: 'TaskList' },
    note: { name: 'NoteLists' },
    template: { name: 'TemplateLists' },
  };
  if (routeMap[result.type]) {
    router.push(routeMap[result.type]);
  }
};
</script>

<template>
  <div :class="{ 'dark-mode': isDark }" class="app-container">

    <div class="sidebar" :class="{ 'disabled': !authStore.isAuthenticated }">
      <router-link :to="{ name: 'Dashboard' }" title="Dashboard">🏠</router-link>
      <router-link :to="{ name: 'Calendar' }" title="Kalender">🗓️</router-link>
      <router-link :to="{ name: 'DocumentList' }" title="Dokumente">📂</router-link>
      <router-link :to="{ name: 'ClassList' }" title="Klassen">🏢</router-link>
      <router-link :to="{ name: 'TaskList' }" title="Aufgaben">📋</router-link>
      <router-link :to="{ name: 'TemplateLists' }" title="Vorlagen">📄</router-link>
      <router-link :to="{ name: 'NoteLists' }" title="Notizen">📝</router-link>
      <router-link :to="{ name: 'Chat' }" title="Chat">💬</router-link>
      <!-- DEBUG: isAdmin={{ authStore.isAdmin }}, userRole={{ authStore.userRole }} -->
      <router-link v-if="authStore.isAdmin" :to="{ name: 'AdminUsers' }" title="Admin">⚙️</router-link>
    </div>

    <div class="main-wrapper">

      <div class="header">
        <div class="logo"><strong>EffSync</strong></div>

        <div v-if="authStore.isAuthenticated" class="search-wrapper">
          <input type="search" placeholder="Search..." v-model="searchStore.query" @focus="onSearchFocus"
            @input="onSearchInput" />
          <div v-if="showResults && searchStore.results.length > 0" class="search-results">
            <div v-for="result in searchStore.results" :key="`${result.type}-${result.id}`" class="search-result-item"
              @click="navigateToResult(result)">
              <span class="result-icon">{{ result.icon }}</span>
              <div class="result-text">
                <span class="result-label">{{ result.label }}</span>
                <span class="result-sub">{{ result.sub }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else style="flex:1"></div>

        <div class="header-actions">

          <div v-if="authStore.isAuthenticated" class="user-menu">
            <div class="avatar" @click.stop="toggleDropdown" title="Profil öffnen">
              {{ userInitial }}
              <span v-if="notificationStore.unreadCount > 0" class="notification-badge">
                {{ notificationStore.unreadCount }}
              </span>
            </div>

            <transition name="fade">
              <div v-if="showDropdown" class="dropdown-menu">
                <div class="dropdown-header">
                  <strong>{{ authStore.userDetails?.username }}</strong>
                  <small>{{ authStore.userRole }}</small>
                </div>
                <hr>
                <router-link :to="{ name: 'UserProfile', params: { id: authStore.userId || 1 } }" class="dropdown-item"
                  @click="showDropdown = false">
                  👤 Mein Profil
                </router-link>

                <router-link :to="{name: 'Settings'}" class="dropdown-item" @click="showDropdown = false">⚙️ Einstellungen</router-link>

                <hr>

                <button @click="handleLogout" class="dropdown-item text-danger">
                  🚪 Abmelden
                </button>
              </div>
            </transition>
          </div>

          <label class="switch-label">
            <input type="checkbox" class="checkbox" v-model="isDark" />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="content" :class="{ 'login-mode': !authStore.isAuthenticated }">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>
    </div>
  </div>
</template>

<style>
/* GLOBALE STYLES (Unverändert) */
body.dark-mode .header {
  background-color: #1e2132 !important;
  border-bottom: 1px solid #434963 !important;
  color: #edf0fa !important;
}

body.dark-mode .header .logo {
  color: #edf0fa !important;
}

body.dark-mode .header input[type="search"] {
  background-color: #31364d !important;
  border: 1px solid #434963 !important;
  color: #edf0fa !important;
}
</style>

<style scoped>
/* --- NEU: Dropdown Styles --- */
.user-menu {
  position: relative;
  /* Wichtig für absolute Positionierung des Dropdowns */
}

.dropdown-menu {
  position: absolute;
  top: 50px;
  /* Abstand von oben */
  right: 0;
  width: 200px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Dark Mode für Dropdown */
:global(body.dark-mode) .dropdown-menu {
  background-color: #2c2c3e;
  border: 1px solid #444;
  color: #ddd;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.dropdown-header {
  padding: 10px 15px;
  display: flex;
  flex-direction: column;
  background-color: #f9f9f9;
}

:global(body.dark-mode) .dropdown-header {
  background-color: #23234c;
  /* Etwas dunkler als die Karte */
}

.dropdown-header strong {
  font-size: 0.95rem;
}

.dropdown-header small {
  font-size: 0.8rem;
  color: #777;
}

.dropdown-item {
  padding: 10px 15px;
  text-decoration: none;
  color: #333;
  font-size: 0.9rem;
  transition: background 0.2s;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  display: block;
  width: 100%;
}

.dropdown-item:hover {
  background-color: #f0f0f0;
}

/* Dark Mode Items */
:global(body.dark-mode) .dropdown-item {
  color: #ddd;
}

:global(body.dark-mode) .dropdown-item:hover {
  background-color: #3b3b54;
}

.text-danger {
  color: #e74c3c !important;
}

.text-danger:hover {
  background-color: #fff5f5;
}

:global(body.dark-mode) .text-danger:hover {
  background-color: #4a2c2c;
}

hr {
  margin: 0;
  border: 0;
  border-top: 1px solid #eee;
}

:global(body.dark-mode) hr {
  border-top: 1px solid #444;
}

/* Animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Restliche Styles (Sidebar etc.) */
.sidebar.disabled {
  pointer-events: none;
  opacity: 0.5;
  filter: grayscale(100%);
}

.app-container {
  display: flex;
  height: 100vh;
  background-color: #f4f4f9;
  transition: background-color 0.3s;
}

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

.logo {
  color: #23234c;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Avatar */
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
  user-select: none;
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #e74c3c;
  color: white;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  border: 2px solid white;
}

:global(body.dark-mode) .notification-badge {
  border-color: #2c2c3e;
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

.content {
  padding: 20px 30px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}

:global(body.dark-mode) .content,
.app-container.dark-mode .content {
  background-color: #1e1e2f !important;
}

.content.login-mode {
  display: flex;
  justify-content: center;
  align-items: center;
}

.search-wrapper {
    position: relative;
    width: 300px;
}

.search-wrapper input[type="search"] {
    width: 100%;
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.search-results {
    position: absolute;
    top: 38px;
    left: 0;
    width: 100%;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 200;
    max-height: 300px;
    overflow-y: auto;
}

.search-result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s;
}

.search-result-item:hover { background: #f5f5f5; }

.result-icon { font-size: 1.1rem; }

.result-text {
    display: flex;
    flex-direction: column;
}

.result-label { font-size: 0.9rem; color: #1f2937; }
.result-sub   { font-size: 0.75rem; color: #9ca3af; }

:global(body.dark-mode) .search-results {
    background: #2c2c3e;
    border-color: #444;
}
:global(body.dark-mode) .search-result-item:hover { background: #3b3b54; }
:global(body.dark-mode) .result-label { color: #ddd; }

</style>

<style>
body.dark-mode .dropdown-menu,
.app-container.dark-mode .dropdown-menu {
  background-color: #25283a !important;
  border-color: #434963 !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.45) !important;
}
body.dark-mode .dropdown-header,
.app-container.dark-mode .dropdown-header {
  background-color: #1e2132 !important;
  border-bottom: 1px solid #434963 !important;
}
body.dark-mode .dropdown-header strong,
.app-container.dark-mode .dropdown-header strong {
  color: #edf0fa !important;
}
body.dark-mode .dropdown-header small,
.app-container.dark-mode .dropdown-header small {
  color: #b2b9cb !important;
}
body.dark-mode .dropdown-item,
.app-container.dark-mode .dropdown-item {
  color: #edf0fa !important;
  background: transparent !important;
}
body.dark-mode .dropdown-item:hover,
.app-container.dark-mode .dropdown-item:hover {
  background-color: #31364d !important;
}
body.dark-mode .dropdown-item.text-danger,
.app-container.dark-mode .dropdown-item.text-danger {
  color: #ff7070 !important;
}
body.dark-mode .dropdown-item.text-danger:hover,
.app-container.dark-mode .dropdown-item.text-danger:hover {
  background-color: #3a1a1a !important;
}
body.dark-mode .dropdown-divider,
.app-container.dark-mode .dropdown-divider {
  border-color: #434963 !important;
  opacity: 1 !important;
}
</style>