<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Aufgabe löschen?</h2>
      </div>
      <div class="modal-body">
        <p>Möchtest du diese Aufgabe wirklich löschen?</p>
        <p v-if="task" class="task-preview">
          <strong>{{ task.title }}</strong>
        </p>
        <p class="warning-text">Diese Aktion kann nicht rückgängig gemacht werden.</p>
      </div>
      <div class="confirmation-input">
        <label for="confirm-title">Gib den Titel "<strong>{{ task?.title }}</strong>" ein, um zu bestätigen:</label>
        <input id="confirm-title" type="text" v-model="confirmationText" placeholder="Aufgabentitel eingeben" />
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
  task: {
    type: Object,
    required: false,
    default: null,
  },
});

const emit = defineEmits(['delete', 'close']);

const confirmationText = ref('');
const errorMessage = ref('');
const isConfirmed = computed(() => {
  return confirmationText.value.trim() === props.task?.title.trim();
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
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 2px solid #fecaca;
}

.modal-header h2 {
  margin: 0;
  color: #dc2626;
  font-size: 1.5rem;
}

.modal-body {
  padding: 24px;
}

.warning-intro {
  margin: 0 0 20px;
  color: #374151;
  font-size: 1rem;
  line-height: 1.5;
}

.task-preview {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #fef2f2;
  border-left: 4px solid #dc2626;
  border-radius: 6px;
}

.preview-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #991b1b;
  font-weight: 600;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.preview-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  word-break: break-word;
}

.danger-zone {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px dashed #fca5a5;
}

.warning-text {
  margin: 0 0 20px;
  padding: 12px;
  background-color: #fef2f2;
  border-left: 3px solid #dc2626;
  color: #991b1b;
  font-weight: 500;
  border-radius: 4px;
  font-size: 0.9rem;
}

.confirmation-input {
  margin-top: 20px;
  padding: 20px;
  background-color: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.confirmation-input label {
  display: block;
  margin-bottom: 10px;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.6;
}

.required-title {
  color: #dc2626;
  font-weight: 600;
  word-break: break-word;
  display: inline-block;
  margin-top: 4px;
}

.confirmation-input input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
  background-color: white;
}

.confirmation-input input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.error-text {
  display: block;
  margin-top: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 500;
}

.success-feedback {
  margin-top: 8px;
  padding: 10px 12px;
  background-color: #d1fae5;
  color: #065f46;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-danger,
.btn-secondary {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
  border-color: #d1d5db;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-danger:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-danger:active:not(:disabled),
.btn-secondary:active {
  transform: translateY(0);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>