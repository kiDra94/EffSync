<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const tabs = [
    { id: 'calendar', label: '📅 Kalender & Ansicht', icon: '🗓️' },
    { id: 'notifications', label: '📬 Benachrichtigungen', icon: '🔔' },
    { id: 'security', label: '🛡️ Sicherheit', icon: '🔒' },
    { id: 'general', label: '⚙️ Allgemein', icon: '🔧' },
];
const goBack = () => router.back();
</script>

<template>
    <div class="settings-view">
        <div class="settings-header">
            <button @click="goBack" class="btn-back">← Zurück</button>
        </div>
        <div class="setting-view">
            <div class="setting-sidebar">
                <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" class="nav-item"
                    :class="{ active: activeTab === tab.id }">
                    <span class="icon">{{ tab.icon }}</span>
                    <span class="label">{{ tab.label }}</span>
                </button>
            </div>
            <div class="setting-main">
                <p>hier dann der inhalt</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100%;
  background-color: white;
}

.settings-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
}

.settings-header h1 {
    margin: 0;
}

.setting-view {
    display: flex;
    height: 100%;
    overflow: hidden;
}

.setting-sidebar {
    width: 280px;
    flex-shrink: 0;
    overflow-y: auto;
    background: white;
    padding-right: 1rem;
    height: 100%;
}

.setting-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: white;
    padding: 1rem;
}

.btn-back {
    background-color: #f3f4f6;
    border: 1px solid #d1d5db;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    color: #1f2937;
}

.btn-back:hover {
    background-color: #e5e7eb;
}

:global(body.dark-mode) .setting-sidebar {
    background: #2c2c3e;
    border-right-color: #444;
}

:global(body.dark-mode) .setting-main {
    background: #1e1e2f;
}

body.dark-mode .btn-back {
    background-color: #3b3b54 !important;
    border-color: #555 !important;
    color: white !important;
}

body.dark-mode .settings-view {
  background-color: #1a1a2e !important;
  color: white !important;
}
</style>
