<template>
  <div class="notifications-container">
    <!-- Header mit Filter -->
    <div class="notifications-header">
      <h3>📬 Benachrichtigungen ({{ notificationStore.notifications.length }})</h3>
      <div class="header-buttons">
        <button
          v-if="notificationStore.unreadCount > 0"
          @click="notificationStore.markAllAsRead()"
          class="btn-secondary"
          title="Alle als gelesen markieren"
        >
          ✓ Alle lesen
        </button>
        <button
          v-if="notificationStore.notifications.length > 0"
          @click="notificationStore.clearAll()"
          class="btn-secondary text-danger"
          title="Alle löschen"
        >
          🗑️ Löschen
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="notifications-filters">
      <button
        v-for="tab in tabs"
        :key="tab.type"
        :class="{ active: activeFilter === tab.type }"
        class="filter-tab"
        @click="activeFilter = tab.type"
      >
        {{ tab.icon }} {{ tab.label }}
        <span v-if="getCountByType(tab.type)" class="filter-count">
          {{ getCountByType(tab.type) }}
        </span>
      </button>
    </div>

    <!-- Notifications List -->
    <div class="notifications-list">
      <div v-if="filteredNotifications.length === 0" class="empty-state">
        <p>{{ activeFilter === 'all' ? '✨ Keine Benachrichtigungen' : '✨ Keine Benachrichtigungen dieses Typs' }}</p>
      </div>

      <div
        v-for="notification in filteredNotifications"
        :key="notification.id"
        class="notification-row"
        :class="{ unread: !notification.read }"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-row-icon">{{ getIcon(notification.type) }}</div>

        <div class="notification-row-content">
          <h4 class="notification-row-title">{{ notification.title }}</h4>
          <p class="notification-row-message">{{ notification.message }}</p>
          <span class="notification-row-time">{{ formatTime(notification.timestamp) }}</span>
        </div>

        <div class="notification-row-status">
          <span v-if="!notification.read" class="status-badge">Neu</span>
        </div>

        <button
          class="notification-row-close"
          @click.stop="notificationStore.removeNotification(notification.id)"
          title="Löschen"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notificationStore';

const router = useRouter();

const notificationStore = useNotificationStore();
const activeFilter = ref('all');

// Filter Tabs
const tabs = [
  { type: 'all', icon: '📬', label: 'Alle' },
  { type: 'change', icon: '✏️', label: 'Änderungen' },
  { type: 'comment', icon: '💬', label: 'Kommentare' },
  { type: 'urgency', icon: '⏰', label: 'Fällig' },
];

// Toast-Icons
const getIcon = (type) => {
  const icons = {
    'change': '✏️',
    'comment': '💬',
    'urgency': '⏰',
    'info': 'ℹ️'
  };
  return icons[type] || 'ℹ️';
};

// Zeitstempel formatieren
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'gerade eben';
  if (diff < 3600000) return `vor ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)}h`;

  return date.toLocaleDateString('de-DE');
};

// Filtern nach Typ
const filteredNotifications = computed(() => {
  if (activeFilter.value === 'all') {
    return notificationStore.sortedNotifications;
  }
  return notificationStore.sortedNotifications.filter(n => n.type === activeFilter.value);
});

// Anzahl pro Typ
const getCountByType = (type) => {
  if (type === 'all') return notificationStore.notifications.length;
  return notificationStore.getByType(type).length;
};

// Benachrichtigung klicken
const handleNotificationClick = (notification) => {
  notificationStore.markAsRead(notification.id);
  
  // Navigation basierend auf Typ
  if (notification.relatedType === 'task' && notification.relatedId) {
    router.push({ name: 'TaskList', query: { taskId: notification.relatedId } });
  } else if (notification.relatedType === 'document' && notification.relatedId) {
    router.push({ name: 'DocumentList', query: { docId: notification.relatedId } });
  } else if (notification.relatedType === 'note' && notification.relatedId) {
    router.push({ name: 'NoteLists', query: { noteId: notification.relatedId } });
  } else if (notification.relatedType === 'class' && notification.relatedId) {
    router.push({ name: 'ClassDetail', params: { id: notification.relatedId } });
  }
};
</script>

<style scoped>
.notifications-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

/* Header */
.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.notifications-header h3 {
  margin: 0;
  color: #23234c;
  font-size: 1.1rem;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  background: white;
  border: 1px solid #ddd;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  font-weight: 500;
  color: #333;
}

.btn-secondary:hover {
  background: #f5f5f5;
  border-color: #999;
}

.text-danger {
  color: #e74c3c !important;
}

/* Filter Tabs */
.notifications-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.filter-tab {
  background: white;
  border: 1px solid #ddd;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #333;
  font-weight: 500;
}

.filter-tab:hover {
  border-color: #4f46e5;
}

.filter-tab.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.filter-count {
  background: #e5e7eb;
  color: #333;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.filter-tab.active .filter-count {
  background: rgba(255, 255, 255, 0.3);
}

/* Notifications List */
.notifications-list {
  max-height: 500px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #aaa;
  text-align: center;
}

.empty-state p {
  margin: 0;
}

/* Notification Row */
.notification-row {
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
  align-items: flex-start;
}

.notification-row:hover {
  background: #f9f9f9;
  border-color: #ddd;
}

.notification-row.unread {
  background: #f0f8ff;
  border: 1px solid #3498db;
}

.notification-row-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-row-content {
  flex: 1;
  min-width: 0;
}

.notification-row-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #23234c;
}

.notification-row-message {
  margin: 4px 0;
  font-size: 0.85rem;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-row-time {
  font-size: 0.75rem;
  color: #aaa;
}

/* Status & Close */
.notification-row-status {
  flex-shrink: 0;
}

.status-badge {
  background: #e74c3c;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.notification-row-close {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 1rem;
  padding: 2px 6px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.notification-row-close:hover {
  color: #e74c3c;
}

/* Scrollbar styling */
.notifications-list::-webkit-scrollbar {
  width: 8px;
}

.notifications-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}

</style>

<style>
/* Dark Mode Styles für NotificationsList */
body.dark-mode .notifications-container {
  background-color: #2c2c3e !important;
}

body.dark-mode .notifications-header h3 {
  color: white !important;
}

body.dark-mode .btn-secondary {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: white !important;
}

body.dark-mode .btn-secondary:hover {
  background-color: #4b4b6a !important;
}

body.dark-mode .filter-tab {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: white !important;
}

body.dark-mode .filter-tab.active {
  background-color: #4f46e5 !important;
  border-color: #4f46e5 !important;
  color: white !important;
}

body.dark-mode .notification-row {
  background-color: #232330 !important;
  border-color: #333 !important;
  color: #ddd !important;
}

body.dark-mode .notification-row:hover {
  background-color: #2c2c3e !important;
  border-color: #555 !important;
}

body.dark-mode .notification-row.unread {
  background-color: #233040 !important;
  border-color: #3498db !important;
}

body.dark-mode .notification-row-title {
  color: white !important;
}

body.dark-mode .notification-row-message {
  color: #ccc !important;
}

body.dark-mode .status-badge {
  background-color: #ef4444 !important;
  color: white !important;
}

body.dark-mode .notification-time {
  color: #999 !important;
}

body.dark-mode .notifications-empty {
  color: #999 !important;
}
</style>
