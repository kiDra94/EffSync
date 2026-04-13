<template>
  <transition name="slide-in">
    <div v-if="visible" class="toast" :class="toastClass">
      <div class="toast-content">
        <span class="toast-icon">{{ icon }}</span>
        <div class="toast-text">
          <p class="toast-title">{{ title }}</p>
          <p class="toast-message">{{ message }}</p>
        </div>
        <button @click="close" class="toast-close">✕</button>
      </div>
      <div class="toast-progress" :style="{ animation: `progress ${duration}ms linear` }"></div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notificationStore';

const props = defineProps({
  notification: {
    type: Object,
    required: true
  },
  duration: { 
    type: Number, 
    default: 5000 
  },
});

const notificationStore = useNotificationStore();
const visible = ref(false);

const icon = computed(() => {
  if (props.notification.type === 'task_overdue') return '🚨';
  if (props.notification.type === 'task_deadline') return '⏰';
  if (props.notification.type === 'task_locked') return '🔒';
  return 'ℹ️';
});

const title = computed(() => {
  switch (props.notification.type) {
    case 'task_overdue':
      return 'Aufgabe Überfällig!';
    case 'task_deadline':
      return 'Aufgabe Erinnerung';
    case 'task_locked':
      return 'Aufgabe Gesperrt';
    default:
      return 'Benachrichtigung';
  }
});

const message = computed(() => props.notification.text);

const toastClass = computed(() => ({
  'toast-error': props.notification.type === 'task_overdue',
  'toast-warning': props.notification.type === 'task_deadline',
  'toast-locked': props.notification.type === 'task_locked',
  'toast-info': !['task_overdue', 'task_deadline', 'task_locked'].includes(props.notification.type),
}));

const close = () => {
  visible.value = false;
  setTimeout(() => {
    notificationStore.removeToast(props.notification.toastId);
  }, 300);
};

onMounted(() => {
  visible.value = true;
  setTimeout(() => close(), props.duration);
});
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  min-width: 320px;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 9999;
  background: white;
  border-left: 5px solid #3498db;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-error {
  border-left-color: #e74c3c;
  background: linear-gradient(135deg, #ffe0e0 0%, #ffcccc 100%);
}

.toast-warning {
  border-left-color: #f39c12;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe8cc 100%);
}

.toast-locked {
  border-left-color: #9b59b6;
  background: linear-gradient(135deg, #f3e5f5 0%, #e8d5f2 100%);
}

.toast-info {
  border-left-color: #3498db;
  background: linear-gradient(135deg, #e3f2fd 0%, #d1e7ff 100%);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.toast-icon {
  font-size: 28px;
  flex-shrink: 0;
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.toast-text {
  flex: 1;
}

.toast-title {
  margin: 0;
  font-weight: 700;
  font-size: 14px;
  color: #333;
}

.toast-message {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.toast-error .toast-title,
.toast-error .toast-message {
  color: #c0392b;
}

.toast-warning .toast-title,
.toast-warning .toast-message {
  color: #d68910;
}

.toast-locked .toast-title,
.toast-locked .toast-message {
  color: #6c3483;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  opacity: 0.7;
  padding: 0;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

.toast-close:hover {
  opacity: 1;
}

.toast-close:active {
  transform: scale(0.9);
}

.toast-progress {
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
}

.slide-in-enter-active,
.slide-in-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.slide-in-enter-from {
  transform: translateX(400px);
  opacity: 0;
}

.slide-in-leave-to {
  transform: translateX(400px);
  opacity: 0;
}

/* Mehrere Toasts übereinander */
@media (max-width: 600px) {
  .toast {
    min-width: 90vw;
    max-width: 90vw;
  }
}
</style>
