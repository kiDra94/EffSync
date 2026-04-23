<template>
  <span class="badge" :class="`badge-${status.toLowerCase()}`">
    {{ statusLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: 'VALID',
    validator: (value) =>
      ['VALID', 'EXPIRED', 'NOT_YET_VALID'].includes(value)
  }
});

const statusLabel = computed(() => {
  const labels = {
    VALID: '✅ Gültig',
    EXPIRED: '❌ Abgelaufen',
    NOT_YET_VALID: '⏳ Ausstehend'
  };
  return labels[props.status] || props.status;
});
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-valid {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.badge-expired {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.badge-not_yet_valid {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}
</style>
