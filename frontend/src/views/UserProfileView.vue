<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import NotificationsList from '@/components/notifications/NotificationsList.vue';
import SecurityTab from '@/components/notifications/SecurityTab.vue';
import EmailPreferences from '@/components/notifications/EmailPreferences.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const userId = computed(() => route.params.id);
const isOwnProfile = computed(() => authStore.userId === parseInt(userId.value) || !userId.value);
const tabs = computed(() => {
  const baseTabs = ['profile', 'security', 'activity'];
  if (isOwnProfile.value) {
    baseTabs.push('notifications');
  }
  return baseTabs;
});

const STORAGE_KEY_PREFIX = 'effsync_user_profile_';

const deriveNameFromUsername = (username) => {
  if (!username) return { firstname: '', lastname: '' };
  const localPart = String(username).split('@')[0] || '';
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return { firstname: '', lastname: '' };
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) return { firstname: parts[0], lastname: '' };
  return {
    firstname: parts[0],
    lastname: parts.slice(1).join(' '),
  };
};

const getBaseUser = () => {
  const details = authStore.userDetails || {};
  const derived = deriveNameFromUsername(details.username || details.email || '');

  return {
    user_id: userId.value || authStore.userId,
    firstname: details.firstname || derived.firstname || '',
    lastname: details.lastname || derived.lastname || '',
    username: details.username || '',
    email: details.email || '',
    role: authStore.userRole || details.role || 'student',
    department: details.department || '—',
    created_at: details.created_at || '—',
    last_login: new Date().toISOString().split('T')[0]
  };
};

const user = ref(getBaseUser());

const editMode = ref(false);
const formData = ref({ ...user.value });
const isSaving = ref(false);
const activeTab = ref('profile');

const loadUserProfile = () => {
  try {
    const storageKey = STORAGE_KEY_PREFIX + userId.value;
    const stored = localStorage.getItem(storageKey);
    const base = getBaseUser();

    if (stored) {
      const storedUser = JSON.parse(stored);
      // Lokale Präferenzen beibehalten, aber Auth-Daten priorisieren
      user.value = {
        ...storedUser,
        ...base,
      };
    } else {
      user.value = base;
    }

    formData.value = { ...user.value };
  } catch (error) {
    console.error('Fehler beim Laden des Profils:', error);
  }
};

const saveUserProfile = () => {
  try {
    const storageKey = STORAGE_KEY_PREFIX + userId.value;
    localStorage.setItem(storageKey, JSON.stringify(user.value));
  } catch (error) {
    console.error('Fehler beim Speichern des Profils:', error);
  }
};

const updateProfile = async () => {
  isSaving.value = true;
  try {
    Object.assign(user.value, formData.value);
    saveUserProfile();
    editMode.value = false;
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  } finally {
    isSaving.value = false;
  }
};

const cancelEdit = () => {
  formData.value = { ...user.value };
  editMode.value = false;
};

const goBack = () => {
  router.back();
};

onMounted(() => {
  loadUserProfile();
  notificationStore.initFromStorage();
  // Tab aus Query-Parameter setzen (z.B. ?tab=notifications)
  if (route.query.tab) {
    if (route.query.tab === 'notifications' && !isOwnProfile.value) {
      activeTab.value = 'profile';
    } else {
      activeTab.value = route.query.tab;
    }
  }
});
</script>

<template>
  <div class="profile-view">
    <button @click="goBack" class="btn-back">← Zurück</button>

    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar-large">
          {{ user.firstname[0] }}{{ user.lastname[0] }}
        </div>
        <div class="user-title">
          <h1>{{ user.firstname }} {{ user.lastname }}</h1>
          <p class="role-badge">{{ user.role }}</p>
        </div>
      </div>

      <div v-if="isOwnProfile && !editMode" class="profile-actions">
        <button @click="editMode = true" class="btn-primary">Profil bearbeiten</button>
      </div>

      <div v-if="editMode" class="profile-actions">
        <button @click="updateProfile" :disabled="isSaving" class="btn-primary">Speichern</button>
        <button @click="cancelEdit" class="btn-secondary">Abbrechen</button>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
        class="tab-btn"
      >
        {{ tab === 'profile' ? 'Profil' : tab === 'security' ? 'Sicherheit' : tab === 'activity' ? 'Aktivität' : '📬 Benachrichtigungen' }}
        <span v-if="tab === 'notifications' && notificationStore.unreadCount > 0" class="tab-badge">
          {{ notificationStore.unreadCount }}
        </span>
      </button>
    </div>

    <div v-if="!isOwnProfile" class="profile-info-banner" role="note">
      🔒 Benachrichtigungen sind nur im eigenen Profil sichtbar.
    </div>

    <div class="tab-content">
      <!-- Profil Tab -->
      <div v-if="activeTab === 'profile'" class="content-section">
        <div class="form-group">
          <label>Vorname</label>
          <input 
            v-if="editMode"
            v-model="formData.firstname" 
            type="text" 
            class="form-input"
            :disabled="!editMode"
          />
          <div v-else class="form-display">{{ user.firstname }}</div>
        </div>

        <div class="form-group">
          <label>Nachname</label>
          <input 
            v-if="editMode"
            v-model="formData.lastname" 
            type="text" 
            class="form-input"
            :disabled="!editMode"
          />
          <div v-else class="form-display">{{ user.lastname }}</div>
        </div>

        <div class="form-group">
          <label>Benutzername</label>
          <div class="form-display">{{ user.username }}</div>
          <small>(Kann nicht geändert werden)</small>
        </div>

        <div class="form-group">
          <label>E-Mail</label>
          <input 
            v-if="editMode"
            v-model="formData.email" 
            type="email" 
            class="form-input"
            :disabled="!editMode"
          />
          <div v-else class="form-display">{{ user.email }}</div>
        </div>

        <div class="form-group">
          <label>Rolle</label>
          <div class="form-display">{{ user.role }}</div>
          <small>(Wird vom Administrator geändert)</small>
        </div>

        <div class="form-group">
          <label>Abteilung</label>
          <div class="form-display">{{ user.department }}</div>
        </div>

        <div class="form-group">
          <label>Benutzerkonto erstellt am</label>
          <div class="form-display">{{ user.created_at }}</div>
        </div>

        <div class="form-group">
          <label>Letzte Anmeldung</label>
          <div class="form-display">{{ user.last_login }}</div>
        </div>
      </div>

      <!-- Sicherheit Tab - mit neuen Komponenten -->
      <div v-if="activeTab === 'security'" class="content-section">
        <!-- 1. Security Features (Passwort + 2FA) -->
        <SecurityTab />
        
        <!-- 2. Email Preferences -->
        <EmailPreferences />
      </div>

      <!-- Aktivität Tab -->
      <div v-if="activeTab === 'activity'" class="content-section">
        <div class="activity-card">
          <h2>Anmeldungshistorie</h2>
          <div class="activity-list">
            <div class="activity-item">
              <span class="activity-time">Heute, 09:30 Uhr</span>
              <span class="activity-location">Chrome - Windows</span>
            </div>
            <div class="activity-item">
              <span class="activity-time">Gestern, 14:15 Uhr</span>
              <span class="activity-location">Safari - macOS</span>
            </div>
            <div class="activity-item">
              <span class="activity-time">21. Feb, 08:45 Uhr</span>
              <span class="activity-location">Firefox - Linux</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Benachrichtigungen Tab -->
      <div v-if="activeTab === 'notifications'" class="content-section">
        <NotificationsList />
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100%;
  background-color: white;
}

.btn-back {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 20px;
  transition: all 0.2s;
  color: #1f2937;
}

.btn-back:hover {
  background-color: #e5e7eb;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.user-title h1 {
  margin: 0;
  color: #1f2937;
  font-size: 1.8rem;
}

.user-title p {
  margin: 4px 0 0;
  color: #e6e8eb;
}

.role-badge {
  background-color: #4f46e5;
  color: rgba(255, 255, 255, 0.944);
  padding: 4px 12px;
  border-radius: 4px;
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.profile-actions {
  display: flex;
  gap: 12px;
}

.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 20px;
}

.profile-info-banner {
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 0.9rem;
}

.tab-btn {
  background-color: transparent;
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.tab-btn:hover {
  color: #1f2937;
}

.tab-badge {
  background-color: #e74c3c;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: bold;
}

.tab-content {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.form-display {
  padding: 10px 12px;
  color: #1f2937;
  background-color: #f9fafb;
  border-radius: 6px;
}

.form-group small {
  color: #999;
  font-size: 0.85rem;
}

.activity-card {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.activity-card h2 {
  margin: 0 0 16px;
  color: #1f2937;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.activity-time {
  font-weight: 500;
  color: #1f2937;
}

.activity-location {
  color: #6b7280;
  font-size: 0.9rem;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-primary:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
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

</style>

<style>
/* Dark Mode Styles für UserProfileView */
body.dark-mode .profile-view {
  background-color: #1a1a2e !important;
  color: white !important;
}

body.dark-mode .btn-back {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: white !important;
}

body.dark-mode .profile-header {
  background-color: #2c2c3e !important;
  border-color: #444 !important;
}

body.dark-mode .tabs {
  border-bottom-color: #444 !important;
}

body.dark-mode .profile-info-banner {
  background-color: #252849 !important;
  border-color: #3f4a8a !important;
  color: #c7d2fe !important;
}

body.dark-mode .tab-btn {
  color: #999 !important;
}

body.dark-mode .tab-btn.active {
  color: #4f46e5 !important;
  border-bottom-color: #4f46e5 !important;
}

body.dark-mode .tab-content {
  background-color: #2c2c3e !important;
  border-color: #444 !important;
  color: #ddd !important;
}

body.dark-mode .btn-primary {
  background-color: #4f46e5 !important;
  color: white !important;
}

body.dark-mode .btn-primary:hover {
  background-color: #4338ca !important;
}

body.dark-mode .btn-secondary {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: white !important;
}

body.dark-mode .btn-secondary:hover {
  background-color: #4b4b6a !important;
}

body.dark-mode .form-group label {
  color: white !important;
}

body.dark-mode .form-display {
  background-color: #1a1a23 !important;
  color: #e0e0e0 !important;
  border-color: #444 !important;
}

body.dark-mode .form-input {
  background-color: #1a1a23 !important;
  color: #e0e0e0 !important;
  border-color: #444 !important;
}

body.dark-mode .activity-card {
  background-color: #232330 !important;
  border-color: #444 !important;
  color: #ddd !important;
}

body.dark-mode .activity-item {
  color: #ddd !important;
  border-bottom-color: #444 !important;
}

body.dark-mode .activity-time {
  color: #4f46e5 !important;
}

body.dark-mode .activity-location {
  color: #999 !important;
}

/* Button disabled state */
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: inherit;
}
</style>
