<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useSearchStore } from "@/stores/searchStore";
import { useSettingsStore } from "@/stores/settingsStore";

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const searchStore = useSearchStore();  // ← new
const router = useRouter();
// T68 (M25): the theme is the user's setting on the server
const settingsStore = useSettingsStore();
const showDropdown = ref(false); // New state for the menu
const showResults = ref(false);


// Click-outside logic: closes the menu when clicking elsewhere
const closeDropdown = (e) => {
  // Close if the click was NOT inside the user menu
  if (!e.target.closest('.user-menu')) {
    showDropdown.value = false;
  }
}

onMounted(async () => {

  window.addEventListener('click', closeDropdown);

  // Load the notifications and start the WebSocket listener
  if (authStore.isAuthenticated) {
    // after a reload the login didn't run: the theme comes from the server
    // here (once per session; the notifications don't wait for it)
    settingsStore.ensureLoaded();
    await notificationStore.fetchNotifications();
    notificationStore.initSocketListeners();
  }
})

// When the user logs in (after a reload), load the notifications
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await notificationStore.fetchNotifications();
    notificationStore.initSocketListeners();
  }
});

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
  notificationStore.destroySocketListeners();
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
}

const handleLogout = async () => {
  await authStore.logout();
  showDropdown.value = false;
};

const navigateToNotification = async (n) => {
  const id = n.notification_id || n.id;
  await notificationStore.markAsRead(id);
  showDropdown.value = false;
  router.push({ name: 'UserProfile', params: { id: authStore.userId || 1 }, query: { tab: 'notifications' } });
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
  <div :class="{ 'dark-mode': settingsStore.isDark }" class="app-container">

    <div class="sidebar" :class="{ 'disabled': !authStore.isAuthenticated }">
      <router-link :to="{ name: 'Dashboard' }" title="Dashboard">🏠</router-link>
      <router-link :to="{ name: 'Calendar' }" title="Kalender">🗓️</router-link>
      <router-link :to="{ name: 'DocumentList' }" title="Dokumente">📂</router-link>
      <router-link v-if="authStore.isAdmin || authStore.userRole === 'teacher'" :to="{ name: 'ClassList' }" title="Klassen">🏢</router-link>
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
              <div v-if="showDropdown" class="dropdown-menu" @click.stop>
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

                <!-- Notifications -->
                <div class="dropdown-notifications">
                  <div class="dropdown-notifications-header">
                    <span>🔔 Benachrichtigungen</span>
                    <button v-if="notificationStore.unreadCount > 0" class="mark-all-read-btn" @click.stop="notificationStore.markAllAsRead()">Alle gelesen</button>
                  </div>
                  <div v-if="notificationStore.unreadNotifications.length === 0" class="notification-empty">
                    Keine neuen Benachrichtigungen
                  </div>
                  <div
                    v-for="n in notificationStore.unreadNotifications.slice(0, 8)"
                    :key="n.notification_id || n.id"
                    class="notification-item"
                    :class="{ unread: !n.is_read && !n.read }"
                    @click.stop="navigateToNotification(n)"
                  >
                    <span class="notification-item-icon">
                      {{ (n.type || '').includes('chat') ? '💬' : (n.type || '').includes('grade') ? '📝' : (n.type || '').includes('task') ? '📋' : '🔔' }}
                    </span>
                    <div class="notification-item-body">
                      <span class="notification-text">{{ n.text || n.message }}</span>
                      <span class="notification-time">{{ n.created_at ? new Date(n.created_at).toLocaleString('de-AT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '' }}</span>
                    </div>
                    <span v-if="!n.is_read && !n.read" class="notification-dot"></span>
                  </div>
                  <div class="notification-see-all">
                    <router-link
                      :to="{ name: 'UserProfile', params: { id: authStore.userId || 1 }, query: { tab: 'notifications' } }"
                      @click="showDropdown = false"
                    >Alle anzeigen →</router-link>
                  </div>
                </div>

                <hr>

                <button @click="handleLogout" class="dropdown-item text-danger">
                  🚪 Abmelden
                </button>
              </div>
            </transition>
          </div>

          <label class="switch-label">
            <input type="checkbox" class="checkbox" :checked="settingsStore.isDark"
              @change="settingsStore.toggleDark()" />
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
/* GLOBAL STYLES (unchanged) */
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
/* --- NEW: dropdown styles --- */
.user-menu {
  position: relative;
  /* Needed for the dropdown's absolute positioning */
}

.dropdown-menu {
  position: absolute;
  top: 50px;
  /* Distance from the top */
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

/* Dark mode for the dropdown */
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
  /* Slightly darker than the card */
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

/* Notification Panel */
.dropdown-notifications {
  padding: 4px 0;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #555;
}

.mark-all-read-btn {
  background: none;
  border: none;
  color: #3498db;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
}

.mark-all-read-btn:hover {
  text-decoration: underline;
}

.notification-empty {
  padding: 8px 12px;
  font-size: 0.8rem;
  color: #999;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 4px;
}

.notification-item:hover {
  background-color: #f0f4ff;
}

.notification-item.unread {
  border-left-color: #e74c3c;
  background-color: #fff8f8;
}

.notification-item-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.notification-item-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.notification-text {
  color: #333;
  font-size: 0.8rem;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-time {
  font-size: 0.7rem;
  color: #999;
  margin-top: 2px;
}

.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  flex-shrink: 0;
  margin-top: 5px;
}

.notification-see-all {
  text-align: center;
  padding: 6px 0 2px;
  font-size: 0.78rem;
}

.notification-see-all a {
  color: #3498db;
  text-decoration: none;
}

.notification-see-all a:hover {
  text-decoration: underline;
}

:global(body.dark-mode) .dropdown-notifications-header { color: #aaa; }
:global(body.dark-mode) .notification-item:hover { background-color: #2a2a3e; }
:global(body.dark-mode) .notification-item.unread { background-color: #2d1a1a; border-left-color: #e74c3c; }
:global(body.dark-mode) .notification-text { color: #ddd; }
:global(body.dark-mode) .notification-empty { color: #777; }
:global(body.dark-mode) .notification-see-all a { color: #7ab8f5; }

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

/* Remaining styles (sidebar etc.) */
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