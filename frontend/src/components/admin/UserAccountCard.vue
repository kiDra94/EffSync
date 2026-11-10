<script setup>
import { ref, watch } from 'vue';

// the selected user's account: edit it, or delete it after a confirmation
// (T75, decision Q17, M35; Definition of done: out of AdminView)
const props = defineProps({
  user: { type: Object, required: true },
  // not the own account
  canDelete: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['edit', 'delete']);

const confirming = ref(false);
watch(() => props.user.user_id, () => { confirming.value = false; });
</script>

<template>
  <div class="management-card">
    <h3>👤 Konto</h3>
    <p class="account-line">@{{ user.username }} · {{ user.email }}</p>
    <div class="account-buttons">
      <button type="button" class="btn-add btn-edit-user" @click="emit('edit')">✏️ Konto bearbeiten</button>
      <button v-if="canDelete" type="button" class="btn-remove btn-delete-user"
        @click="confirming = true">🗑️ Konto löschen</button>
    </div>
    <div v-if="confirming" class="delete-confirm" role="alertdialog" aria-labelledby="delete-confirm-text">
      <p id="delete-confirm-text">
        Konto von <strong>{{ user.firstname }} {{ user.lastname }}</strong> wirklich löschen?
        Geteilte Inhalte (Aufgaben, Chat, Dokumente) bleiben unter „Gelöschter Benutzer“ erhalten,
        persönliche Daten werden gelöscht.
      </p>
      <button type="button" class="btn-remove btn-confirm-delete" :disabled="busy" @click="emit('delete')">
        Endgültig löschen
      </button>
      <button type="button" class="btn-cancel-delete" @click="confirming = false">Abbrechen</button>
    </div>
  </div>
</template>

<style scoped src="./admin-card.css"></style>
<style src="./admin-card-dark.css"></style>
