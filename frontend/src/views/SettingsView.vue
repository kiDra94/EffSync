<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import SecurityTab from '@/components/notifications/SecurityTab.vue';
import EmailPreferences from '@/components/notifications/EmailPreferences.vue';
import NotificationsList from '@/components/notifications/NotificationsList.vue';
import GeneralSettings from '../components/settings/GeneralSettings.vue';
import CalendarSettings from '../components/settings/CalendarSettings.vue';

const router = useRouter();
const tabs = [
    { id: 'general',       icon: '⚙️',  label: 'Allgemein',                desc: 'Darstellung & Dark Mode' },
    { id: 'calendar',      icon: '📅',  label: 'Kalender & Ansicht',       desc: 'Filter, Anzeige, Zeiten' },
    { id: 'notifications', icon: '🔔',  label: 'Benachrichtigungen',       desc: 'In-App Hinweise' },
    { id: 'email',         icon: '📬',  label: 'E-Mail',                   desc: 'Benachrichtigungstypen' },
    { id: 'security',      icon: '🛡️',  label: 'Sicherheit',               desc: 'Passwort & 2FA' },
];
const tabTitles = {
    general:       { title: 'Allgemein',                 sub: 'Darstellung und App-Einstellungen' },
    calendar:      { title: 'Kalender & Ansicht',        sub: 'Filter, sichtbare Elemente und Zeitbereich' },
    notifications: { title: 'Benachrichtigungen',        sub: 'In-App Mitteilungen konfigurieren' },
    email:         { title: 'E-Mail Benachrichtigungen', sub: 'Wähle, worüber du per E-Mail informiert wirst' },
    security:      { title: 'Sicherheit',                sub: 'Passwort ändern und Zwei-Faktor-Authentifizierung' },
};
const goBack = () => router.back();
const activeTab = ref('general');
</script>

<template>
    <div class="settings-view">
        <div class="settings-header">
            <button @click="goBack" class="btn-back">← Zurück</button>
            <div class="settings-title-block">
                <h1>Einstellungen</h1>
                <p>Konfiguriere deine App nach deinen Wünschen</p>
            </div>
        </div>

        <div class="setting-layout">
            <!-- Sidebar -->
            <aside class="setting-sidebar">
                <nav class="sidebar-nav">
                    <button
                        v-for="tab in tabs"
                        :key="tab.id"
                        @click="activeTab = tab.id"
                        class="nav-item"
                        :class="{ active: activeTab === tab.id }"
                    >
                        <span class="nav-icon">{{ tab.icon }}</span>
                        <span class="nav-text">
                            <span class="nav-label">{{ tab.label }}</span>
                            <span class="nav-desc">{{ tab.desc }}</span>
                        </span>
                    </button>
                </nav>
            </aside>

            <!-- Main Content -->
            <main class="setting-main">
                <div class="content-header">
                    <h2>{{ tabTitles[activeTab].title }}</h2>
                    <p>{{ tabTitles[activeTab].sub }}</p>
                </div>
                <div class="content-body">
                    <GeneralSettings       v-if="activeTab === 'general'" />
                    <CalendarSettings      v-if="activeTab === 'calendar'" />
                    <NotificationsList     v-if="activeTab === 'notifications'" />
                    <EmailPreferences      v-if="activeTab === 'email'" />
                    <SecurityTab           v-if="activeTab === 'security'" />
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
.settings-view {
    max-width: 980px;
    margin: 0 auto;
    padding: 28px 20px;
    min-height: 100%;
}

.settings-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 28px;
}

.settings-title-block h1 {
    margin: 0 0 2px;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1f36;
}

.settings-title-block p {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
}

.btn-back {
    background-color: #f3f4f6;
    border: 1px solid #d1d5db;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    color: #1f2937;
    white-space: nowrap;
    flex-shrink: 0;
}

.btn-back:hover {
    background-color: #e5e7eb;
}

.setting-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
}

/* ===== SIDEBAR ===== */
.setting-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    position: sticky;
    top: 20px;
}

.sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
}

.nav-item:hover {
    background: #f3f4f6;
}

.nav-item.active {
    background: #eff3ff;
}

.nav-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
    width: 28px;
    text-align: center;
}

.nav-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}

.nav-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.nav-item.active .nav-label {
    color: #3b5bdb;
}

.nav-desc {
    font-size: 0.75rem;
    color: #9ca3af;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ===== MAIN ===== */
.setting-main {
    flex: 1;
    min-width: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    overflow: hidden;
}

.content-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e5e7eb;
}

.content-header h2 {
    margin: 0 0 4px;
    font-size: 1.15rem;
    font-weight: 700;
    color: #1a1f36;
}

.content-header p {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
}

.content-body {
    padding: 24px;
}
</style>

<style>
/* ===== DARK MODE ===== */
body.dark-mode .settings-view,
.app-container.dark-mode .settings-view {
  color: #edf0fa !important;
}

body.dark-mode .settings-title-block h1,
.app-container.dark-mode .settings-title-block h1 {
  color: #edf0fa !important;
}

body.dark-mode .settings-title-block p,
.app-container.dark-mode .settings-title-block p {
  color: #b2b9cb !important;
}

body.dark-mode .btn-back,
.app-container.dark-mode .btn-back {
  background: #31364d !important;
  border-color: #434963 !important;
  color: #edf0fa !important;
}

body.dark-mode .setting-sidebar,
.app-container.dark-mode .setting-sidebar {
  background: #25283a !important;
  border-color: #434963 !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;
}

body.dark-mode .nav-item,
.app-container.dark-mode .nav-item {
  background: transparent !important;
}

body.dark-mode .nav-item:hover,
.app-container.dark-mode .nav-item:hover {
  background: #31364d !important;
}

body.dark-mode .nav-item.active,
.app-container.dark-mode .nav-item.active {
  background: #2d3a5a !important;
}

body.dark-mode .nav-label,
.app-container.dark-mode .nav-label {
  color: #edf0fa !important;
}

body.dark-mode .nav-item.active .nav-label,
.app-container.dark-mode .nav-item.active .nav-label {
  color: #7fa5ff !important;
}

body.dark-mode .nav-desc,
.app-container.dark-mode .nav-desc {
  color: #7a8199 !important;
}

body.dark-mode .setting-main,
.app-container.dark-mode .setting-main {
  background: #25283a !important;
  border-color: #434963 !important;
}

body.dark-mode .content-header,
.app-container.dark-mode .content-header {
  border-bottom-color: #434963 !important;
}

body.dark-mode .content-header h2,
.app-container.dark-mode .content-header h2 {
  color: #edf0fa !important;
}

body.dark-mode .content-header p,
.app-container.dark-mode .content-header p {
  color: #b2b9cb !important;
}
</style>
