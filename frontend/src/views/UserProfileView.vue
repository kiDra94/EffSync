<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import NotificationsList from '@/components/notifications/NotificationsList.vue';
import { emailPreferencesService } from '@/api/emailPreferences';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const userId = computed(() => route.params.id);
const isOwnProfile = computed(() => authStore.userId === parseInt(userId.value) || !userId.value);

const STORAGE_KEY_PREFIX = 'effsync_user_profile_';

// Email Preferences State
const emailPreferences = ref({
  preference_id: null,
  user_id: null,
  email_on_deadline: true,
  email_on_mention: true,
  email_on_comment: true,
  email_digest: false,
  digest_frequency: 'daily',
});

const loadingPreferences = ref(false);
const savingPreferences = ref(false);
const preferencesError = ref('');

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

// Load Email Preferences
const loadEmailPreferences = async () => {
  if (!isOwnProfile.value) return;
  
  loadingPreferences.value = true;
  preferencesError.value = '';
  
  try {
    const prefs = await emailPreferencesService.getPreferences();
    emailPreferences.value = prefs;
  } catch (error) {
    console.error('Error loading email preferences:', error);
    preferencesError.value = 'Fehler beim Laden der E-Mail-Einstellungen';
  } finally {
    loadingPreferences.value = false;
  }
};

// Save Email Preferences
const saveEmailPreferences = async () => {
  savingPreferences.value = true;
  preferencesError.value = '';
  
  try {
    const updated = await emailPreferencesService.updatePreferences({
      email_on_deadline: emailPreferences.value.email_on_deadline,
      email_on_mention: emailPreferences.value.email_on_mention,
      email_on_comment: emailPreferences.value.email_on_comment,
      email_digest: emailPreferences.value.email_digest,
      digest_frequency: emailPreferences.value.digest_frequency,
    });
    
    emailPreferences.value = updated;
    // Show success message
    setTimeout(() => {
      preferencesError.value = '';
    }, 3000);
  } catch (error) {
    console.error('Error saving email preferences:', error);
    preferencesError.value = 'Fehler beim Speichern der E-Mail-Einstellungen';
  } finally {
    savingPreferences.value = false;
  }
};

onMounted(() => {
  loadUserProfile();
  notificationStore.initFromStorage();
  loadEmailPreferences();
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
        v-for="tab in ['profile', 'security', 'activity', 'notifications']"
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

        <div class="security-card">
          <h2>📧 E-Mail-Benachrichtigungen</h2>
          <div v-if="preferencesError" class="error-msg">{{ preferencesError }}</div>
          
          <div v-if="loadingPreferences" class="loading-text">Lädt...</div>
          <div v-else class="email-preferences-form">
            <!-- Deadline Notifications -->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="emailPreferences.email_on_deadline"
                  class="checkbox-input"
                />
                <span class="checkbox-text">⏰ E-Mail bei Aufgaben-Fälligkeit</span>
              </label>
              <small>Erhalte E-Mails wenn deine Aufgaben bald fällig sind</small>
            </div>

            <!-- Mention Notifications -->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="emailPreferences.email_on_mention"
                  class="checkbox-input"
                />
                <span class="checkbox-text">📢 E-Mail bei Erwähnungen</span>
              </label>
              <small>Erhalte E-Mails wenn du in einem Kommentar erwähnt wirst</small>
            </div>

            <!-- Comment Notifications -->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="emailPreferences.email_on_comment"
                  class="checkbox-input"
                />
                <span class="checkbox-text">💬 E-Mail bei neuen Kommentaren</span>
              </label>
              <small>Erhalte E-Mails wenn neue Kommentare zu deinen Aufgaben hinzugefügt werden</small>
            </div>

            <!-- Digest Toggle -->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="emailPreferences.email_digest"
                  class="checkbox-input"
                />
                <span class="checkbox-text">📋 Tägliche E-Mail-Zusammenfassung</span>
              </label>
              <small>Erhalte eine zusammengefasste E-Mail statt einzelner Benachrichtigungen</small>
            </div>

            <!-- Digest Frequency -->
            <div v-if="emailPreferences.email_digest" class="form-group">
              <label for="digest_frequency">Zusammenfassungs-Häufigkeit:</label>
              <select 
                id="digest_frequency" 
                v-model="emailPreferences.digest_frequency"
                class="form-select"
              >
                <option value="daily">📅 Täglich</option>
                <option value="weekly">📆 Wöchentlich</option>
                <option value="monthly">📊 Monatlich</option>
              </select>
            </div>

            <!-- Save Button -->
            <div class="form-group">
              <button 
                @click="saveEmailPreferences" 
                :disabled="savingPreferences"
                class="btn-secondary"
              >
                {{ savingPreferences ? '💾 Speichert...' : '💾 Einstellungen speichern' }}
              </button>
            </div>
          </div>
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

body.dark-mode .security-card,
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

/* Email Preferences Styles */
.email-preferences-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 0.75rem;
  font-size: 1rem;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #4f46e5;
}

.checkbox-label:hover {
  opacity: 0.8;
}

.checkbox-group small {
  margin-left: 2rem;
  color: #666;
  font-size: 0.85rem;
}

body.dark-mode .checkbox-group small {
  color: #aaa;
}

.form-select {
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #ddd;
  background-color: white;
  color: #333;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

body.dark-mode .form-select {
  background-color: #1a1a23;
  color: #e0e0e0;
  border-color: #444;
}

body.dark-mode .form-select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

.error-msg {
  background-color: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #fcc;
  margin-bottom: 1rem;
}

body.dark-mode .error-msg {
  background-color: #4c2424;
  color: #ff9999;
  border-color: #633;
}

.loading-text {
  color: #666;
  font-style: italic;
  margin: 1rem 0;
}

body.dark-mode .loading-text {
  color: #aaa;
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
