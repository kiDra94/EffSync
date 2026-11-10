<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAdminStore } from '@/stores/entities/adminStore';

// T77, UC-40, decisions Q18, I2, I3 (M35): which permissions each role has,
// and each permission's R/W/X flags. The flags belong to the permission, so
// a change applies to every role; the role's users have the change at once.
const FLAGS = [
  { bit: 4, label: 'R', title: 'Lesen' },
  { bit: 2, label: 'W', title: 'Schreiben' },
  { bit: 1, label: 'X', title: 'Ausführen' },
];

const adminStore = useAdminStore();
const roles = ref([]);
const permissions = ref([]);
const roleId = ref('');
// permission_id → { assigned, flags } for the chosen role
const draft = ref({});
const saving = ref(false);
const error = ref('');
const message = ref('');

const role = computed(() => roles.value.find((r) => r.role_id === Number(roleId.value)) ?? null);

function pick() {
  error.value = '';
  message.value = '';
  const assigned = new Set((role.value?.roles_permissions ?? []).map((rp) => rp.permissions.permission_id));
  draft.value = Object.fromEntries(
    permissions.value.map((p) => [p.permission_id, { assigned: assigned.has(p.permission_id), flags: p.flags }]),
  );
}

function setFlag(permissionId, bit, on) {
  const entry = draft.value[permissionId];
  entry.flags = on ? entry.flags | bit : entry.flags & ~bit;
}

async function save() {
  if (!role.value) return;
  saving.value = true;
  error.value = '';
  message.value = '';
  // flags only where they changed: a screen opened earlier doesn't undo
  // another change to a permission's flags (review M35)
  const entries = permissions.value
    .filter((p) => draft.value[p.permission_id].assigned)
    .map((p) => {
      const flags = draft.value[p.permission_id].flags;
      return flags === p.flags ? { permission_id: p.permission_id } : { permission_id: p.permission_id, flags };
    });
  try {
    const saved = await adminStore.setRolePermissions(role.value.role_id, entries);
    // the flags are the permission's, for every role (decision I2)
    for (const { permission_id, flags } of entries) {
      const permission = permissions.value.find((p) => p.permission_id === permission_id);
      if (permission && flags !== undefined) permission.flags = flags;
    }
    roles.value = roles.value.map((r) => (r.role_id === saved.role_id ? saved : r));
    message.value = `Gespeichert: ${saved.name}`;
  } catch (e) {
    error.value = e?.response?.data?.message || 'Die Konfiguration konnte nicht gespeichert werden.';
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    [roles.value, permissions.value] = await Promise.all([adminStore.fetchRoles(), adminStore.fetchPermissions()]);
  } catch {
    error.value = 'Rollen und Berechtigungen konnten nicht geladen werden.';
  }
});
</script>

<template>
  <section class="system-config">
    <h2>🛠️ Systemkonfiguration</h2>
    <p class="config-hint">
      Welche Berechtigungen eine Rolle hat. Die Flags gehören zur Berechtigung und gelten für alle Rollen;
      Benutzer der Rolle haben die Änderung sofort. Direkte Berechtigungen eines Benutzers
      (Benutzerverwaltung) gelten zusätzlich.
    </p>
    <label class="role-pick">
      Rolle
      <select v-model="roleId" name="role" @change="pick">
        <option value="" disabled>-- Rolle wählen --</option>
        <option v-for="r in roles" :key="r.role_id" :value="String(r.role_id)">{{ r.name }}</option>
      </select>
    </label>

    <p v-if="error" class="config-error" role="alert">{{ error }}</p>
    <p v-if="message" class="config-message" role="status">{{ message }}</p>

    <form v-if="role" @submit.prevent="save">
      <table class="config-table">
        <thead>
          <tr><th>Berechtigung</th><th>Zugewiesen</th><th v-for="flag in FLAGS" :key="flag.bit" :title="flag.title">{{ flag.label }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in permissions" :key="p.permission_id" :data-permission="p.name">
            <td>{{ p.name }}</td>
            <td><input v-model="draft[p.permission_id].assigned" type="checkbox" name="assigned" :aria-label="`${p.name} zugewiesen`" /></td>
            <td v-for="flag in FLAGS" :key="flag.bit">
              <input type="checkbox" name="flag" :aria-label="`${p.name} ${flag.title}`"
                :checked="(draft[p.permission_id].flags & flag.bit) !== 0"
                :disabled="!draft[p.permission_id].assigned"
                @change="setFlag(p.permission_id, flag.bit, $event.target.checked)" />
            </td>
          </tr>
        </tbody>
      </table>
      <button type="submit" class="btn-add" :disabled="saving">Speichern</button>
    </form>
  </section>
</template>

<style scoped>
.system-config { background: white; border-radius: 8px; padding: 20px; }
.config-hint { color: #6c757d; font-size: 0.9rem; }
.role-pick { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.role-pick select { padding: 6px 8px; border: 1px solid #ced4da; border-radius: 4px; }
.config-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.config-table th, .config-table td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center; }
.config-table th:first-child, .config-table td:first-child { text-align: left; }
.config-error { color: #b91c1c; }
.config-message { color: #15803d; }
.btn-add { background: #28a745; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; }
.btn-add:disabled { opacity: 0.6; cursor: default; }
</style>

<style>
/* not scoped (see SearchResults.vue, review M26) */
body.dark-mode .system-config { background: #2c2c3e; color: #ddd; }
body.dark-mode .system-config .config-table th,
body.dark-mode .system-config .config-table td { border-bottom-color: #444; }
body.dark-mode .system-config select { background: #1e1e2e; color: #ddd; border-color: #444; }
</style>
