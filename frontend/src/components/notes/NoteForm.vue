<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ note ? 'Notiz bearbeiten' : 'Neue Notiz' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <form @submit.prevent="submitForm" class="form">

        <div class="form-group">
          <label for="title">Titel *</label>
          <input
            v-model="formData.title"
            id="title"
            type="text"
            placeholder="z.B. Projektmeeting"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Beschreibung</label>
          <textarea
            v-model="formData.description"
            id="description"
            rows="4"
            placeholder="Detaillierte Beschreibung der Notiz..."
          ></textarea>
        </div>

        <div class="form-group">
          <label for="priority">Priorität</label>
          <select v-model="formData.priority" id="priority">
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn-primary">Speichern</button>
          <button type="button" @click="close" class="btn-secondary">Abbrechen</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  note: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['save', 'close']);

const formData = ref({
  title: '',
  description: '',
  priority: 'medium',
});

watch(
  () => props.note,
  (newVal) => {
    if (newVal) {
      formData.value = { ...newVal };
    } else {
      formData.value = {
        title: '',
        description: '',
        priority: 'medium',
      };
    }
  },
  { immediate: true }
);

const submitForm = () => {
  emit('save', formData.value);
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
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: #4338ca;
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
/* ── NoteForm Dark Mode ── */
body.dark-mode .modal-content {
  background: #252536 !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6) !important;
  color: #edf0fa;
}

body.dark-mode .modal-header {
  border-bottom-color: #3a3d52 !important;
}

body.dark-mode .modal-header h2 {
  color: #edf0fa;
}

body.dark-mode .close-btn {
  color: #7a7d96;
}

body.dark-mode .close-btn:hover {
  color: #edf0fa;
}

body.dark-mode .form-group label {
  color: #c8cde0;
}

body.dark-mode .form-group input,
body.dark-mode .form-group textarea,
body.dark-mode .form-group select {
  background: #1e1e2f !important;
  border-color: #3a3d52 !important;
  color: #edf0fa !important;
}

body.dark-mode .form-group input:focus,
body.dark-mode .form-group textarea:focus,
body.dark-mode .form-group select:focus {
  border-color: #6c63ff !important;
  box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.2) !important;
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
