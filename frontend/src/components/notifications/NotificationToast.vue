<template>
  <transition name="toast-slide">
    <div 
      v-if="visible"
      class="toast"
      :class="[`toast-${notification.type}`, { 'toast-read': notification.read }]"
    >
      <div class="toast-content">
        <div class="toast-icon">{{ getIcon(notification.type) }}</div>
        <div class="toast-body">
          <h4 class="toast-title">{{ notification.title }}</h4>
          <p class="toast-message">{{ notification.message }}</p>
          <span class="toast-time">{{ formatTime(notification.timestamp) }}</span>
        </div>
      </div>
      <button class="toast-close" @click="handleClose">×</button>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notificationStore';

const props = defineProps({
  notification: {
    type: Object,
    required: true
  },
  duration: {
    type: Number,
    default: 5000 // 5 Sekunden
  }
});

const emit = defineEmits(['remove']);
const notificationStore = useNotificationStore();
const visible = ref(true);

// Toast-Icons nach Typ
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

// Toast schließen
const handleClose = () => {
  visible.value = false;
  setTimeout(() => {
    emit('remove', props.notification.id);
    notificationStore.removeNotification(props.notification.id);
  }, 300);
};

// Auto-Schließen nach Duration
onMounted(() => {
  setTimeout(() => {
    handleClose();
  }, props.duration);

  // Als gelesen markieren
  notificationStore.markAsRead(props.notification.id);
});
</script>

<style scoped>
.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid #3498db;
  min-width: 300px;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
}

.toast-content {
  display: flex;
  gap: 12px;
  flex: 1;
}

.toast-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.toast-body {
  flex: 1;
}

.toast-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #23234c;
}

.toast-message {
  margin: 4px 0;
  font-size: 0.85rem;
  color: #666;
}

.toast-time {
  font-size: 0.75rem;
  color: #aaa;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #ccc;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toast-close:hover {
  color: #999;
}

/* Toast Typen */
.toast-change {
  border-left-color: #3498db;
}

.toast-comment {
  border-left-color: #2ecc71;
}

.toast-urgency {
  border-left-color: #e74c3c;
}

.toast-info {
  border-left-color: #9b59b6;
}

/* Animation */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from {
  transform: translateX(400px);
  opacity: 0;
}

.toast-slide-leave-to {
  transform: translateX(400px);
  opacity: 0;
}

/* Dark Mode */
:global(body.dark-mode) .toast {
  background-color: #2c2c3e !important;
  border-left-color: #4f46e5 !important;
}

:global(body.dark-mode) .toast-title {
  color: white !important;
}

:global(body.dark-mode) .toast-message {
  color: #ccc !important;
}

:global(body.dark-mode) .toast-time {
  color: #999 !important;
}

:global(body.dark-mode) .toast-close {
  color: #888 !important;
}

:global(body.dark-mode) .toast-close:hover {
  color: #bbb !important;
}
</style>
