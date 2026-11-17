<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ template ? 'Template bearbeiten' : 'Neues Template' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <form @submit.prevent="submitTemplate" class="template-form">

        <div class="form-group">
          <label for="name">Template-Name *</label>
          <input v-model="formData.name" id="name" type="text" placeholder="z.B. Wöchentliche Hausübung" required />
        </div>

        <div class="form-group">
          <label for="description">Beschreibung</label>
          <textarea v-model="formData.description" id="description" rows="2"
            placeholder="Wofür wird dieses Template verwendet?"></textarea>
        </div>


        <div class="form-actions">
          <button type="submit" class="btn-primary">
            {{ template ? 'Speichern' : 'Erstellen' }}
          </button>
          <button type="button" @click="close" class="btn-secondary">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';

const props = defineProps({
  template: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['save', 'close']);

// T110 (M18, decision H2): a template is a name and a description
const formData = reactive({
  name: props.template?.name || '',
  description: props.template?.description || ''
});

const submitTemplate = () => {
  const templateData = {
    ...formData,
    ...(props.template?.template_id && { template_id: props.template.template_id })
  };
  emit('save', templateData);
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #1f2937;
}

.task-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 600;
  font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4f46e5;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #9ca3af;
}

.progress-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.progress-slider {
  flex: 1;
  height: 6px;
  padding: 0;
}

.progress-number {
  width: 70px;
  padding: 8px;
}

.progress-label {
  color: #6b7280;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary,
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

.btn-primary {
  background-color: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background-color: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-primary:active,
.btn-secondary:active {
  transform: translateY(0);
}

.form-section {
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.form-section legend {
  font-weight: 600;
  color: #4f46e5;
  padding: 0 8px;
}

.hint {
  display: block;
  font-size: 0.8rem;
  color: #9ca3af;
  margin-top: 4px;
}
</style>