<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <form @submit.prevent="submitTask" class="task-form" novalidate>

        <TaskTemplateSelector 
          v-if="!task" 
          @templateSelected="applyTemplate" 
        />

        <div class="form-group" :class="{ 'has-error': errors.title }">
          <label for="title">Titel *</label>
          <input v-model="formData.title" id="title" type="text" placeholder="z.B. API-Struktur implementieren"
            @blur="validateTitle" @input="errors.title = ''" />
          <span v-if="errors.title" class="error-message">{{ errors.title }}</span>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.description }">
          <label for="description">
            Beschreibung
            <span v-if="formData.priority_id >= 3" class="required-star">*</span>
          </label>
          <textarea v-model="formData.description" id="description" rows="3"
            placeholder="Detaillierte Beschreibung der Aufgabe" @blur="validateDescription"
            @input="errors.description = ''"></textarea>
          <span v-if="errors.description" class="error-message">{{ errors.description }}</span>
          <span v-if="formData.priority_id >= 3" class="info-message">
            ℹ️ Wichtige Aufgaben benötigen eine Beschreibung
          </span>
        </div>

        <div class="form-group">
          <label for="priority_id">Priorität *</label>
          <select v-model.number="formData.priority_id" id="priority_id" @change="validateDescription">
            <option :value="1">Niedrig</option>
            <option :value="2">Mittel</option>
            <option :value="3">Hoch</option>
            <option :value="4">Dringend</option>
          </select>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.deadline }">
          <label for="deadline">Deadline *</label>
          <input type="datetime-local" v-model="formData.deadline" id="deadline" @blur="validateDeadline"
            @change="validateDeadline" />
          <span v-if="errors.deadline" class="error-message">{{ errors.deadline }}</span>
          <span v-if="warnings.deadline" class="warning-message">{{ warnings.deadline }}</span>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.status }">
          <label for="status">Status *</label>
          <select v-model="formData.status" id="status" @change="validateStatusProgress">
            <option value="TODO">Zu erledigen</option>
            <option value="IN_PROGRESS">In Bearbeitung</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="ON_HOLD">Pausiert</option>
            <option value="COMPLETED">Abgeschlossen</option>
          </select>
          <span v-if="errors.status" class="error-message">{{ errors.status }}</span>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.progress }">
          <label for="progress">Fortschritt (%)</label>
          <div class="progress-input-group">
            <input type="range" v-model.number="formData.progress" id="progress" min="0" max="100"
              class="progress-slider" @input="validateStatusProgress" />
            <input type="number" v-model.number="formData.progress" min="0" max="100" class="progress-number"
              @blur="validateStatusProgress" @input="validateStatusProgress" />
            <span class="progress-label">%</span>
          </div>
          <span v-if="errors.progress" class="error-message">{{ errors.progress }}</span>
        </div>

        <div v-if="showSummary && hasErrors" class="error-summary">
          ⚠️ Bitte korrigiere die markierten Fehler
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            {{ task ? 'Speichern' : 'Erstellen' }}
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
import { reactive, ref } from 'vue';
import { useTaskValidation } from '@/composables/useTaskValidation';
import TaskTemplateSelector from '@/components/tasks/TaskTemplateSelector.vue';

const props = defineProps({
  task: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['save', 'close']);

const {
  errors,
  warnings,
  hasErrors,
  clearError,
  validateTitle,
  validateDescription,
  validateDeadline,
  validateStatusProgress,
  validateAll
} = useTaskValidation(props.existingTasks)

function formatForInput(isoString) {
  if (!isoString) return '';
  return isoString.slice(0, 16);
}

const formData = reactive({
  title: props.task?.title || '',
  description: props.task?.description || '',
  deadline: formatForInput(props.task?.deadline) || '',
  priority_id: props.task?.priority_id || 2, // Default Mittel
  status: props.task?.status || 'TODO',
  progress: props.task?.progress || 0
});

const showSummary = ref(false);

const submitTask = () => {
  showSummary.value = true;

  if (!validateAll(formData, props.task?.task_id)) { return; }
  const taskData = {
    ...formData,
    ...(props.task?.task_id && { task_id: props.task.task_id })
  };

  emit('save', taskData);
  showSummary.value = false;
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
  transition: border-color 0.2s;
  font-family: inherit;
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
</style>