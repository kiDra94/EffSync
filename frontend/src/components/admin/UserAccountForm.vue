<script setup>
import { reactive, ref } from 'vue';
import { useAdminStore } from '@/stores/entities/adminStore';

// T75, UC-30, decision Q17 (M35): an admin creates an account or edits its
// names and e-mail; the password is set only at creation (the user changes
// it in the profile, T47)
const props = defineProps({
  user: { type: Object, default: null },
});
const emit = defineEmits(['saved', 'cancel']);

const adminStore = useAdminStore();
const isNew = !props.user;
const fields = reactive({
  firstname: props.user?.firstname ?? '',
  lastname: props.user?.lastname ?? '',
  username: props.user?.username ?? '',
  email: props.user?.email ?? '',
  ...(isNew ? { password: '' } : {}),
});
const saving = ref(false);
const error = ref('');

// review M35: only what changed, so an unchanged field that predates the
// rules (e.g. a seeded username shorter than 7) doesn't block the edit
const changes = () =>
  Object.fromEntries(Object.entries(fields).filter(([key, value]) => value !== (props.user[key] ?? '')));

async function save() {
  if (!isNew && Object.keys(changes()).length === 0) {
    emit('cancel');
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const saved = isNew
      ? await adminStore.createUser({ ...fields })
      : await adminStore.updateUser(props.user.user_id, changes());
    emit('saved', saved);
  } catch (e) {
    const message = e?.response?.data?.message;
    error.value = (Array.isArray(message) ? message.join(' ') : message) || 'Das Konto konnte nicht gespeichert werden.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="account-form" @submit.prevent="save">
    <h3>{{ isNew ? '➕ Neues Konto' : '✏️ Konto bearbeiten' }}</h3>
    <div class="account-fields">
      <label>Vorname <input v-model="fields.firstname" name="firstname" required minlength="3" /></label>
      <label>Nachname <input v-model="fields.lastname" name="lastname" required minlength="3" /></label>
      <label>Benutzername <input v-model="fields.username" name="username" required minlength="7" maxlength="32" /></label>
      <label>E-Mail <input v-model="fields.email" name="email" type="email" required /></label>
      <label v-if="isNew">
        Passwort
        <input v-model="fields.password" name="password" type="password" required minlength="7" maxlength="32"
          autocomplete="new-password" />
      </label>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="account-actions">
      <button type="submit" class="btn-add" :disabled="saving">{{ isNew ? 'Anlegen' : 'Speichern' }}</button>
      <button type="button" class="btn-cancel" @click="emit('cancel')">Abbrechen</button>
    </div>
  </form>
</template>

<style scoped>
.account-form { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.account-form h3 { margin-top: 0; font-size: 1.1rem; }
.account-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.account-fields label { display: flex; flex-direction: column; font-size: 0.85rem; gap: 4px; }
.account-fields input { padding: 6px 8px; border: 1px solid #ced4da; border-radius: 4px; }
.account-actions { display: flex; gap: 8px; margin-top: 12px; }
.btn-add { background: #28a745; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; }
.btn-add:disabled { opacity: 0.6; cursor: default; }
.btn-cancel { background: #6c757d; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; }
.form-error { color: #b91c1c; margin: 8px 0 0; }
</style>

<style>
/* not scoped (see SearchResults.vue, review M26) */
body.dark-mode .account-form { background: #2c2c3e; border-color: #444; }
body.dark-mode .account-form input { background: #1e1e2e; color: #ddd; border-color: #444; }
</style>
