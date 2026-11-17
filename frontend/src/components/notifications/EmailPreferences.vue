<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

const route = useRoute();
const authStore = useAuthStore();
// M25 (decision Q19): data through the store, not the api/ layer
const settingsStore = useSettingsStore();

const userId = computed(() => route.params.id);
const isOwnProfile = computed(() => authStore.userId === parseInt(userId.value) || !userId.value);

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

// Load Email Preferences
const loadEmailPreferences = async () => {
  if (!isOwnProfile.value) return;
  
  loadingPreferences.value = true;
  preferencesError.value = '';
  
  try {
    const prefs = await settingsStore.loadEmailPreferences();
    if (prefs) {
      emailPreferences.value = { ...emailPreferences.value, ...prefs };
    }
  } catch (error) {
    console.error('Error loading email preferences:', error);
    preferencesError.value = 'Fehler beim Laden der E-Mail-Einstellungen';
  } finally {
    loadingPreferences.value = false;
  }
};

// Save Email Preferences
const saveEmailPreferences = async () => {
  if (!emailPreferences.value) {
    preferencesError.value = 'Einstellungen nicht geladen';
    return;
  }
  
  savingPreferences.value = true;
  preferencesError.value = '';
  
  try {
    const updated = await settingsStore.saveEmailPreferences({
      email_on_deadline: emailPreferences.value.email_on_deadline,
      email_on_mention: emailPreferences.value.email_on_mention,
      email_on_comment: emailPreferences.value.email_on_comment,
      email_digest: emailPreferences.value.email_digest,
      digest_frequency: emailPreferences.value.digest_frequency,
    });
    
    emailPreferences.value = { ...emailPreferences.value, ...updated };
  } catch (error) {
    console.error('Error saving email preferences:', error);
    preferencesError.value = 'Fehler beim Speichern der E-Mail-Einstellungen';
  } finally {
    savingPreferences.value = false;
  }
};

onMounted(async () => {
  await nextTick();
  loadEmailPreferences();
});
</script>

<template>
  <div class="email-preferences-card">
    <div class="security-card">
      <h2>📧 E-Mail-Benachrichtigungen</h2>
      <div v-if="preferencesError" class="error-msg">{{ preferencesError }}</div>
      
      <div v-if="loadingPreferences" class="loading-text">Lädt...</div>
      <div v-else class="email-preferences-form">
        <!-- Deadline Notifications -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="emailPreferences.email_on_deadline" class="checkbox-input" />
            <span class="checkbox-text">⏰ E-Mail bei Aufgaben-Fälligkeit</span>
          </label>
          <small>Erhalte E-Mails wenn deine Aufgaben bald fällig sind</small>
        </div>

        <!-- Mention Notifications -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="emailPreferences.email_on_mention" class="checkbox-input" />
            <span class="checkbox-text">📢 E-Mail bei Erwähnungen</span>
          </label>
          <small>Erhalte E-Mails wenn du in einem Kommentar erwähnt wirst</small>
        </div>

        <!-- Comment Notifications -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="emailPreferences.email_on_comment" class="checkbox-input" />
            <span class="checkbox-text">💬 E-Mail bei neuen Kommentaren</span>
          </label>
          <small>Erhalte E-Mails wenn neue Kommentare zu deinen Aufgaben hinzugefügt werden</small>
        </div>

        <!-- Digest Toggle -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="emailPreferences.email_digest" class="checkbox-input" />
            <span class="checkbox-text">📋 Tägliche E-Mail-Zusammenfassung</span>
          </label>
          <small>Erhalte eine zusammengefasste E-Mail statt einzelner Benachrichtigungen</small>
        </div>

        <!-- Digest Frequency -->
        <div v-if="emailPreferences.email_digest" class="form-group">
          <label for="digest_frequency">Zusammenfassungs-Häufigkeit:</label>
          <select id="digest_frequency" v-model="emailPreferences.digest_frequency" class="form-select">
            <option value="daily">📅 Täglich</option>
            <option value="weekly">📆 Wöchentlich</option>
            <option value="monthly">📊 Monatlich</option>
          </select>
        </div>

        <!-- Save Button -->
        <div class="form-group">
          <button @click="saveEmailPreferences" :disabled="savingPreferences" class="btn-secondary">
            {{ savingPreferences ? '💾 Speichert...' : '💾 Einstellungen speichern' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
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

.email-preferences-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
  color: #6b7280;  /* ← grey like security-card p */
  font-size: 0.85rem;
}

.form-select {
  padding: 10px 12px;  /* ← same as form-input */
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  background-color: white;
}

.form-select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.error-msg {
  background-color: #fee;
  color: #c33;
  padding: 10px 12px;
  border: 1px solid #fcc;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.loading-text {
  color: #6b7280;  /* ← grey like security-card p */
  font-style: italic;
  margin: 1rem 0;
  padding: 10px 12px;
  background-color: #f9fafb;
  border-radius: 6px;
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

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: inherit;
}
</style>

<style>
/* Dark mode - consistent with Security */
body.dark-mode .security-card {
  background-color: #232330 !important;
  border-color: #444 !important;
  color: #ddd !important;
}

body.dark-mode .security-card h2 {
  color: white !important;
}

body.dark-mode .form-group label {
  color: white !important;
}

body.dark-mode .checkbox-group small {
  color: #999 !important;
}

body.dark-mode .form-select {
  background-color: #1a1a23 !important;
  color: #e0e0e0 !important;
  border-color: #444 !important;
}

body.dark-mode .form-select:focus {
  border-color: #4f46e5 !important;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

body.dark-mode .error-msg {
  background-color: #4c2424 !important;
  color: #ff9999 !important;
  border-color: #633 !important;
}

body.dark-mode .loading-text {
  color: #999 !important;
  background-color: #232330 !important;
}

body.dark-mode .btn-secondary {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: white !important;
}

body.dark-mode .btn-secondary:hover {
  background-color: #4b4b6a !important;
}
</style>
