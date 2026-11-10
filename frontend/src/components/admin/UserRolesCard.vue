<script setup>
import { ref } from 'vue';

// UC-31: the selected user's roles (Definition of done: out of AdminView)
const CRITICAL_ROLES = ['Superuser', 'Admin'];

const props = defineProps({
  user: { type: Object, required: true },
  // the roles that can be assigned
  roles: { type: Array, required: true },
  // all users, for the last-holder rule
  users: { type: Array, required: true },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['add', 'remove']);

const newRoleId = ref('');

// the last Superuser or Admin keeps the role (the backend refuses it too)
const canRemove = (role) =>
  !CRITICAL_ROLES.includes(role.roles?.name) ||
  props.users.filter((u) => u.user_roles?.some((ur) => ur.role_id === role.role_id)).length > 1;

function add() {
  if (!newRoleId.value) return;
  emit('add', Number(newRoleId.value));
  newRoleId.value = '';
}
</script>

<template>
  <div class="management-card">
    <h3>🎯 Rollen ({{ user.user_roles?.length || 0 }})</h3>

    <div v-if="user.user_roles && user.user_roles.length > 0" class="roles-list">
      <div v-for="role in user.user_roles" :key="role.role_id" class="role-item">
        <span class="role-name">{{ role.roles?.name }}</span>
        <button
          @click="emit('remove', role.role_id)"
          :disabled="busy || !canRemove(role)"
          class="btn-remove"
          :title="canRemove(role) ? 'Entfernen' : 'Es muss mindestens 1 ' + role.roles?.name + ' existieren'"
        >
          ✕
        </button>
      </div>
    </div>
    <p v-else class="no-items">Noch keine Rollen zugewiesen</p>

    <div class="add-role-section">
      <label for="role-select">Neue Rolle zuweisen:</label>
      <select v-model="newRoleId" id="role-select" class="select-field">
        <option value="">-- Rolle wählen --</option>
        <option v-for="role in roles" :key="role.role_id" :value="role.role_id">
          {{ role.name }}
        </option>
      </select>
      <button @click="add" :disabled="!newRoleId || busy" class="btn-add">
        + Rolle hinzufügen
      </button>
    </div>
  </div>
</template>

<style scoped src="./admin-card.css"></style>
<style src="./admin-card-dark.css"></style>
