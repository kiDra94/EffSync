<template>
  <div class="notification-center">
    <!-- Trigger Button (oben rechts) -->
    <div class="notification-trigger">
      <button 
        class="notification-bell"
        :class="{ 'has-unread': notificationStore.unreadCount > 0 }"
        @click="isOpen = !isOpen"
        title="Benachrichtigungen"
      >
        🔔
        <span v-if="notificationStore.unreadCount > 0" class="unread-badge">
          {{ notificationStore.unreadCount }}
        </span>
      </button>
    </div>

    <!-- Panel -->
    <transition name="panel-fade">
      <div v-if="isOpen" class="notification-panel">
        <!-- Header -->
        <div class="panel-header">
          <h3>Benachrichtigungen</h3>
          <button 
            v-if="notificationStore.unreadCount > 0"
            class="mark-all-read-btn"
            @click="notificationStore.markAllAsRead()"
          >
            ✓ Alle lesen
          </button>
        </div>

        <!-- Filter Tabs -->
        <div class="panel-filters">
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

        <!-- Notification List -->
        <div class="notifications-list">
          <div v-if="filteredNotifications.length === 0" class="empty-state">
            <p>{{ activeFilter === 'all' ? 'Keine Benachrichtigungen' : 'Keine Benachrichtigungen dieses Typs' }}</p>
          </div>

          <div
            v-for="notification in filteredNotifications"
            :key="notification.id"
            class="notification-item"
            :class="{ unread: !notification.read }"
            @click="handleNotificationClick(notification)"
          >
            <div class="notification-item-icon">{{ getIcon(notification.type) }}</div>
            
            <div class="notification-item-content">
              <h4 class="notification-item-title">{{ notification.title }}</h4>
              <p class="notification-item-message">{{ notification.message }}</p>
              <span class="notification-item-time">{{ formatTime(notification.timestamp) }}</span>
            </div>

            <button
              class="notification-item-close"
              @click.stop="notificationStore.removeNotification(notification.id)"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="notificationStore.notifications.length > 0" class="panel-footer">
          <button class="clear-all-btn" @click="notificationStore.clearAll()">
            Alle löschen
          </button>
        </div>
      </div>
    </transition>

    <!-- Outside Click Detection -->
    <div v-if="isOpen" class="panel-backdrop" @click="isOpen = false"></div>

    <!-- Toast Container -->
    <div class="toast-container">
      <NotificationToast
        v-for="notification in toastNotifications"
        :key="notification.id"
        :notification="notification"
        @remove="removeToast"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notificationStore';
import NotificationToast from './NotificationToast.vue';

const notificationStore = useNotificationStore();
const isOpen = ref(false);
const activeFilter = ref('all');
const toastNotifications = ref([]);

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
  if (notification.actionUrl) {
    // Navigation zu related Item (z.B. Task)
    window.location.hash = notification.actionUrl;
  }
};

// Toast entfernen
const removeToast = (id) => {
  toastNotifications.value = toastNotifications.value.filter(t => t.id !== id);
};

// Neu hinzugefügte Benachrichtigungen als Toast zeigen
const watchNewNotifications = () => {
  const initialLength = notificationStore.notifications.length;
  
  setInterval(() => {
    const currentLength = notificationStore.notifications.length;
    if (currentLength > initialLength) {
      const newNotifications = notificationStore.notifications.slice(0, currentLength - initialLength);
      toastNotifications.value = [...newNotifications, ...toastNotifications.value].slice(0, 3); // Max 3 Toasts
    }
  }, 500);
};

onMounted(() => {
  notificationStore.initFromStorage();
  watchNewNotifications();
});
</script>

<style scoped>
.notification-center {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

/* Trigger Button */
.notification-trigger {
  position: relative;
}

.notification-bell {
  background: white;
  border: 2px solid #ddd;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.notification-bell:hover {
  border-color: #4f46e5;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
  transform: scale(1.05);
}

.notification-bell.has-unread {
  border-color: #e74c3c;
}

.unread-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

/* Panel */
.notification-panel {
  position: absolute;
  top: 60px;
  right: 0;
  width: 400px;
  max-height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1001;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.panel-header h3 {
  margin: 0;
  color: #23234c;
  font-size: 1.1rem;
}

.mark-all-read-btn {
  background: none;
  border: none;
  color: #4f46e5;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 4px 8px;
  transition: all 0.2s;
}

.mark-all-read-btn:hover {
  background: #f5f5f5;
  border-radius: 4px;
}

/* Filter Tabs */
.panel-filters {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
  background: #fafafa;
}

.filter-tab {
  background: white;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
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
  background: rgba(0, 0, 0, 0.1);
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
  flex: 1;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f9f9f9;
}

.notification-item.unread {
  background: #f0f8ff;
  border-left: 3px solid #3498db;
}

.notification-item-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-item-content {
  flex: 1;
  min-width: 0;
}

.notification-item-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #23234c;
}

.notification-item-message {
  margin: 4px 0;
  font-size: 0.85rem;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-item-time {
  font-size: 0.75rem;
  color: #aaa;
}

.notification-item-close {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  transition: color 0.2s;
}

.notification-item-close:hover {
  color: #999;
}

/* Empty State */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: #aaa;
  text-align: center;
}

.empty-state p {
  margin: 0;
}

/* Panel Footer */
.panel-footer {
  border-top: 1px solid #eee;
  padding: 12px;
  background: #fafafa;
}

.clear-all-btn {
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  padding: 8px 12px;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background: #f5f5f5;
  border-color: #999;
}

/* Toast Container */
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast-container > * {
  pointer-events: auto;
}

/* Backdrop */
.panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

/* Animations */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: all 0.2s ease;
}

.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Dark Mode */
:global(body.dark-mode) .notification-bell {
  background-color: #2c2c3e !important;
  border-color: #555 !important;
  color: white !important;
}

:global(body.dark-mode) .notification-bell:hover {
  border-color: #4f46e5 !important;
}

:global(body.dark-mode) .notification-panel {
  background-color: #2c2c3e !important;
  border: 1px solid #444 !important;
}

:global(body.dark-mode) .panel-header {
  border-bottom-color: #444 !important;
}

:global(body.dark-mode) .panel-header h3 {
  color: white !important;
}

:global(body.dark-mode) .panel-filters {
  background-color: #232330 !important;
  border-bottom-color: #444 !important;
}

:global(body.dark-mode) .filter-tab {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: #ccc !important;
}

:global(body.dark-mode) .filter-tab.active {
  background-color: #4f46e5 !important;
  border-color: #4f46e5 !important;
  color: white !important;
}

:global(body.dark-mode) .notification-item {
  border-bottom-color: #333 !important;
}

:global(body.dark-mode) .notification-item:hover {
  background-color: #333 !important;
}

:global(body.dark-mode) .notification-item.unread {
  background-color: #233040 !important;
}

:global(body.dark-mode) .notification-item-title {
  color: white !important;
}

:global(body.dark-mode) .notification-item-message {
  color: #ccc !important;
}

:global(body.dark-mode) .panel-footer {
  background-color: #232330 !important;
  border-top-color: #444 !important;
}

:global(body.dark-mode) .clear-all-btn {
  background-color: #3b3b54 !important;
  border-color: #555 !important;
  color: #ccc !important;
}

:global(body.dark-mode) .clear-all-btn:hover {
  background-color: #4b4b6a !important;
}

@media (max-width: 600px) {
  .notification-panel {
    width: 90vw;
    max-width: 400px;
    right: -10vw;
    left: auto;
  }

  .notification-center {
    right: 10px;
  }
}
</style>
