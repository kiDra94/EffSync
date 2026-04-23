<script setup>
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import DeadlineToast from '@/components/notifications/DeadlineToast.vue'

const notificationStore = useNotificationStore()

// Feature #27: Toast-Notifications anzeigen
const activeToasts = computed(() => {
  return notificationStore.activeToasts
})
</script>

<template>
  <!-- Feature #27: Toast Container für Deadline-Benachrichtigungen -->
  <div class="toasts-container">
    <DeadlineToast
      v-for="toast in activeToasts"
      :key="toast.toastId"
      :notification="toast"
    />
  </div>

  <router-view />
</template>

<style>
/* Optional: Globale Styles hier, z.B. Reset */
body {
  margin: 0;
  padding: 0;
  font-family: sans-serif;
}
</style>