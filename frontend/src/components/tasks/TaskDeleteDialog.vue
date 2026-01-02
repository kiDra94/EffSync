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
      </div>
      <div class="modal-actions">
        <button @click="confirmDelete" class="btn-danger">Löschen</button>
        <button @click="close" class="btn-secondary">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['delete', 'close']);

const confirmDelete = () => {
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
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0 0 16px;
  color: #6b7280;
}

.task-preview {
  background-color: #f3f4f6;
  padding: 12px;
  border-radius: 8px;
  color: #1f2937 !important;
}

.warning-text {
  color: #ef4444 !important;
  font-size: 0.9rem;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
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

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-danger:active,
.btn-secondary:active {
  transform: translateY(0);
}
</style>