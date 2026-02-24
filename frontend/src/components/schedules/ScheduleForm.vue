<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ schedule ? 'Stundenplan bearbeiten' : 'Neuer Stundenplan' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <form @submit.prevent="submitForm" class="form">

        <div class="form-group">
          <label for="name">Name *</label>
          <input
            v-model="formData.name"
            id="name"
            type="text"
            placeholder="z.B. Stundenplan Wintersemester 2025/26"
            required
          />
        </div>

        <div class="form-group">
          <label for="valid_from">Gültig von *</label>
          <input
            v-model="formData.valid_from"
            id="valid_from"
            type="date"
            required
          />
        </div>

        <div class="form-group">
          <label for="valid_to">Gültig bis *</label>
          <input
            v-model="formData.valid_to"
            id="valid_to"
            type="date"
            required
          />
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
  schedule: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['save', 'close']);

const formData = ref({
  name: '',
  valid_from: '',
  valid_to: '',
});

watch(
  () => props.schedule,
  (newVal) => {
    if (newVal) {
      formData.value = { ...newVal };
    } else {
      formData.value = {
        name: '',
        valid_from: '',
        valid_to: '',
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

.form-group input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus {
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
