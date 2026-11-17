<script setup>
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import DeadlineToast from '@/components/notifications/DeadlineToast.vue'

const notificationStore = useNotificationStore()

// Feature #27: show toast notifications
const activeToasts = computed(() => {
  return notificationStore.activeToasts
})
</script>

<template>
  <!-- Feature #27: toast container for deadline notifications -->
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
/* Optional: global styles go here, e.g. a reset */
body {
  margin: 0;
  padding: 0;
  font-family: sans-serif;
}
</style>