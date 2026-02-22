<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const userId = computed(() => route.params.id);
const isOwnProfile = computed(() => authStore.userId === parseInt(userId.value) || !userId.value);

const STORAGE_KEY_PREFIX = 'effsync_user_profile_';

// Mock user data
const user = ref({
  user_id: userId.value || authStore.userId,
  firstname: authStore.userDetails?.firstname || 'Max',
  lastname: authStore.userDetails?.lastname || 'Mustermann',
  username: authStore.userDetails?.username || 'mustermann',
  email: authStore.userDetails?.email || 'mustermann@schule.at',
  role: authStore.userRole || 'Lehrer',
  department: 'Informationstechnologie',
  created_at: '2024-09-01',
  last_login: new Date().toISOString().split('T')[0]
});

const editMode = ref(false);
const formData = ref({ ...user.value });
const isSaving = ref(false);
const activeTab = ref('profile');

const loadUserProfile = () => {
  try {
    const storageKey = STORAGE_KEY_PREFIX + userId.value;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      user.value = JSON.parse(stored);
      formData.value = { ...user.value };
    }
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
        v-for="tab in ['profile', 'security', 'activity']"
        :key="tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
        class="tab-btn"
      >
        {{ tab === 'profile' ? 'Profil' : tab === 'security' ? 'Sicherheit' : 'Aktivität' }}
      </button>
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

      <!-- Sicherheit Tab -->
      <div v-if="activeTab === 'security'" class="content-section">
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

        <div class="security-card">
          <h2>Zwei-Faktor-Authentifizierung</h2>
          <p>Sichern Sie Ihr Konto mit 2FA.</p>
          <button class="btn-secondary">2FA aktivieren</button>
        </div>
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
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.btn-back {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 20px;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #e5e7eb;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
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
  background: #4f46e5;
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
  color: #6b7280;
}

.role-badge {
  background: #4f46e5;
  color: white;
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

.tab-btn {
  background: none;
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.tab-btn:hover {
  color: #1f2937;
}

.tab-content {
  background: white;
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
  background: #f9fafb;
  border-radius: 6px;
}

.form-group small {
  color: #999;
  font-size: 0.85rem;
}

.security-card {
  background: #f9fafb;
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

.activity-card {
  background: #f9fafb;
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
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>
