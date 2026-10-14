<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Notiz löschen?</h2>
      </div>
      <div class="modal-body">
        <p>Möchtest du diese Notiz wirklich löschen?</p>
        <p v-if="note" class="preview">
          <strong>{{ note.title }}</strong>
        </p>
        <p class="warning-text">Diese Aktion kann nicht rückgängig gemacht werden.</p>
      </div>
      <div class="confirmation-input">
        <label for="confirm-title">Gib den Titel "<strong>{{ note?.title }}</strong>" ein, um zu bestätigen:</label>
        <input id="confirm-title" v-model="confirmationText" type="text" placeholder="Notiztitel eingeben" />
        <span v-if="errorMessage" class="error-text">{{ errorMessage }}</span>
      </div>
      <div class="modal-actions">
        <button @click="confirmDelete" class="btn-danger">Löschen</button>
        <button @click="close" class="btn-secondary">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  note: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['delete', 'close']);

const confirmationText = ref('');
const errorMessage = ref('');

const isConfirmed = computed(() => {
  return confirmationText.value.trim() === props.note?.title.trim();
});

const confirmDelete = () => {
  if (!isConfirmed.value) {
    errorMessage.value = 'Der Titel stimmt nicht überein.';
    return;
  }
  emit('delete');
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 450px;
  width: 90%;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #dc2626;
}

.modal-body {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-body p {
  margin: 0 0 12px;
  color: #6b7280;
}

.preview {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  color: #1f2937;
  margin: 12px 0;
}

.warning-text {
  color: #dc2626;
  font-weight: 600;
}

.confirmation-input {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fef2f2;
  border-bottom: 1px solid #e5e7eb;
}

.confirmation-input label {
  font-size: 0.9rem;
  color: #6b7280;
}

.confirmation-input input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.confirmation-input input:focus {
  outline: none;
  border-color: #dc2626;
}

.error-text {
  color: #dc2626;
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
}

.btn-danger {
  background-color: #dc2626;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background-color: #b91c1c;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>

<style>
/* ── NoteDeleteDialog Dark Mode ── */
body.dark-mode .modal-content {
  background: #252536 !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6) !important;
}

body.dark-mode .modal-header {
  border-bottom-color: #3a3d52 !important;
}

body.dark-mode .modal-body {
  border-bottom-color: #3a3d52 !important;
}

body.dark-mode .modal-body p {
  color: #9094ad;
}

body.dark-mode .preview {
  background: #1e1e2f !important;
  color: #edf0fa !important;
}

body.dark-mode .confirmation-input {
  background: #2a1f2e !important;
  border-bottom-color: #3a3d52 !important;
}

body.dark-mode .confirmation-input label {
  color: #9094ad;
}

body.dark-mode .confirmation-input input {
  background: #1e1e2f !important;
  border-color: #3a3d52 !important;
  color: #edf0fa !important;
}

body.dark-mode .modal-actions .btn-secondary {
  background: #2e2e45;
  border-color: #3a3d52;
  color: #c8cde0;
}

body.dark-mode .modal-actions .btn-secondary:hover {
  background: #3a3d52;
}
</style>
