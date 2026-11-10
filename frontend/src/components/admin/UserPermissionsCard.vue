<script setup>
import { ref } from 'vue';

// the selected user's direct permissions, each with an optional validity
// (Definition of done: out of AdminView)
defineProps({
  user: { type: Object, required: true },
  // the permissions that can be granted
  permissions: { type: Array, required: true },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['add', 'remove']);

const newPermissionId = ref('');
const validFrom = ref('');
const validTo = ref('');

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('de-DE') : '—');

function add() {
  if (!newPermissionId.value) return;
  emit('add', {
    permissionId: Number(newPermissionId.value),
    validFrom: validFrom.value || null,
    validTo: validTo.value || null,
  });
  newPermissionId.value = '';
  validFrom.value = '';
  validTo.value = '';
}
</script>

<template>
  <div class="management-card">
    <h3>🔐 Direkte Permissions ({{ user.user_permissions?.length || 0 }})</h3>

    <div v-if="user.user_permissions && user.user_permissions.length > 0" class="permissions-list">
      <div v-for="perm in user.user_permissions" :key="perm.user_permission_id" class="permission-item">
        <div class="permission-info">
          <span class="permission-name">{{ perm.permissions?.name }}</span>
          <span v-if="perm.valid_from || perm.valid_to" class="permission-dates">
            📅 {{ formatDate(perm.valid_from) }}
            <span v-if="perm.valid_to">→ {{ formatDate(perm.valid_to) }}</span>
          </span>
        </div>
        <button @click="emit('remove', perm.permissions?.permission_id)" :disabled="busy" class="btn-remove" title="Entfernen">
          ✕
        </button>
      </div>
    </div>
    <p v-else class="no-items">Noch keine direkten Permissions</p>

    <div class="add-permission-section">
      <label for="permission-select">Neue Permission zuweisen:</label>
      <select v-model="newPermissionId" id="permission-select" class="select-field">
        <option value="">-- Permission wählen --</option>
        <option v-for="perm in permissions" :key="perm.permission_id" :value="perm.permission_id">
          {{ perm.name }}
        </option>
      </select>

      <div class="date-inputs">
        <div class="date-group">
          <label for="valid-from">Gültig ab (optional):</label>
          <input id="valid-from" v-model="validFrom" type="date" class="input-field" />
        </div>
        <div class="date-group">
          <label for="valid-to">Gültig bis (optional):</label>
          <input id="valid-to" v-model="validTo" type="date" class="input-field" />
        </div>
      </div>

      <button @click="add" :disabled="!newPermissionId || busy" class="btn-add">
        + Permission hinzufügen
      </button>
    </div>
  </div>
</template>

<style scoped src="./admin-card.css"></style>
<style src="./admin-card-dark.css"></style>
