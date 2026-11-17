<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

// T67, T68 (M25): light, dark or the device's theme, stored per user on
// the server (decision Q8f), no longer in localStorage
const settingsStore = useSettingsStore()
const darkMode = computed(() => settingsStore.theme)
</script>

<template>
  <div class="dark-mode-section">
    <label class="dark-mode-label">
      <span>🌙 Dark Mode</span>
      <div class="dark-mode-toggle">
        <button 
          class="toggle-btn light" 
          :class="{ active: darkMode === 'light' }"
          @click="settingsStore.setTheme('light')"
        >
          ☀️ Light
        </button>
        <button 
          class="toggle-btn dark" 
          :class="{ active: darkMode === 'dark' }"
          @click="settingsStore.setTheme('dark')"
        >
          🌙 Dark
        </button>
        <button 
          class="toggle-btn system" 
          :class="{ active: darkMode === 'system' }"
          @click="settingsStore.setTheme('system')"
        >
          💻 System
        </button>
      </div>
    </label>
    <p v-if="settingsStore.saveError" class="save-error" role="alert">{{ settingsStore.saveError }}</p>
  </div>
</template>

<style scoped>
.dark-mode-section {
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.save-error {
  margin: 12px 0 0;
  color: #b91c1c;
}

.dark-mode-label {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dark-mode-label span {
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.dark-mode-toggle {
  display: flex;
  gap: 12px;
}

.toggle-btn {
  flex: 1;
  padding: 14px 8px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
}

.toggle-btn:hover {
  border-color: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.toggle-btn.active {
  border-color: #4f46e5;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

.toggle-btn.system.active {
  background: linear-gradient(135deg, #10b981, #059669);
}
</style>

<style>
body.dark-mode .general-settings h2,
body.dark-mode .general-settings h3,
body.dark-mode .section-title,
.app-container.dark-mode .general-settings h2,
.app-container.dark-mode .general-settings h3,
.app-container.dark-mode .section-title {
  color: #edf0fa !important;
}

body.dark-mode .setting-item,
.app-container.dark-mode .setting-item {
  border-color: #434963 !important;
}

body.dark-mode .setting-label,
body.dark-mode .setting-item label,
.app-container.dark-mode .setting-label,
.app-container.dark-mode .setting-item label {
  color: #edf0fa !important;
}

body.dark-mode .setting-desc,
body.dark-mode .setting-item p,
.app-container.dark-mode .setting-desc,
.app-container.dark-mode .setting-item p {
  color: #b2b9cb !important;
}

body.dark-mode .toggle-btn,
.app-container.dark-mode .toggle-btn {
  background: #31364d !important;
  border-color: #434963 !important;
  color: #b2b9cb !important;
}

body.dark-mode .toggle-btn:hover,
.app-container.dark-mode .toggle-btn:hover {
  border-color: #7a90ff !important;
  color: #edf0fa !important;
}
</style>
