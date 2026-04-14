<template>
  <div class="modal-overlay task-form-overlay" @click.self="close">
    <div class="modal-content task-form-modal">
      <div class="modal-header">
        <h2>{{ task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <!-- Feature #27: Display lock warning -->
      <div v-if="isTaskLocked" class="lock-warning">
        🔒 <strong>Aufgabe gesperrt:</strong> {{ lockedReason }}
      </div>

      <form @submit.prevent="submitTask" class="task-form" novalidate :class="{ 'is-locked': isTaskLocked }">

        <TaskTemplateSelector v-if="!task" @templateSelected="applyTemplate" />

        <div class="form-group" :class="{ 'has-error': errors.title }">
          <label for="title">Titel *</label>
          <input v-model="formData.title" id="title" type="text" placeholder="z.B. API-Struktur implementieren"
            @blur="validateTitle(formData.title, props.task?.task_id)" @input="errors.title = ''" :disabled="isTaskLocked" />
          <span v-if="errors.title" class="error-message">{{ errors.title }}</span>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.description }">
          <label for="description">
            Beschreibung
            <span v-if="formData.priority_id >= 3" class="required-star">*</span>
          </label>
          <textarea v-model="formData.description" id="description" rows="3"
            placeholder="Detaillierte Beschreibung der Aufgabe" @blur="validateDescription(formData.description, formData.priority_id)"
            @input="errors.description = ''" :disabled="isTaskLocked"></textarea>
          <span v-if="errors.description" class="error-message">{{ errors.description }}</span>
          <span v-if="formData.priority_id >= 3" class="info-message">
            ℹ️ Wichtige Aufgaben benötigen eine Beschreibung
          </span>
        </div>

        <div class="form-group">
          <label for="priority_id">Priorität *</label>
          <select v-model.number="formData.priority_id" id="priority_id" @change="validateDescription" :disabled="isTaskLocked">
            <option :value="1">Niedrig</option>
            <option :value="2">Mittel</option>
            <option :value="3">Hoch</option>
            <option :value="4">Dringend</option>
          </select>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.deadline }">
          <label for="deadline">Deadline *</label>
          <input type="datetime-local" v-model="formData.deadline" id="deadline" @blur="validateDeadline(formData.deadline)"
            @change="validateDeadline(formData.deadline)" :disabled="isTaskLocked" />
          <span v-if="errors.deadline" class="error-message">{{ errors.deadline }}</span>
          <span v-if="warnings.deadline" class="warning-message">{{ warnings.deadline }}</span>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.status }">
          <label for="status">Status *</label>
          <select v-model="formData.status" id="status" @change="validateStatusProgress(formData.status, formData.progress)" :disabled="isTaskLocked">
            <option value="TODO">Zu erledigen</option>
            <option value="IN_PROGRESS">In Bearbeitung</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="ON_HOLD">Pausiert</option>
            <option value="COMPLETED">Abgeschlossen</option>
          </select>
          <span v-if="errors.status" class="error-message">{{ errors.status }}</span>
        </div>

        <div v-if="task" class="form-group" :class="{ 'has-error': errors.progress }">
          <label for="progress">Fortschritt (%)</label>
          <div class="progress-input-group">
            <input type="range" v-model.number="formData.progress" id="progress" min="0" max="100"
              class="progress-slider" @input="validateStatusProgress(formData.status, formData.progress)" :disabled="isTaskLocked" />
            <input type="number" v-model.number="formData.progress" min="0" max="100" class="progress-number"
              @blur="validateStatusProgress(formData.status, formData.progress)" @input="validateStatusProgress(formData.status, formData.progress)" :disabled="isTaskLocked" />
            <span class="progress-label">%</span>
          </div>
          <span v-if="errors.progress" class="error-message">{{ errors.progress }}</span>
        </div>

        <SubtaskBuilder v-model="subtasks" />

        <!-- Task Members Section (nur wenn Task bereits existiert) -->
        <TaskMembersList
          v-if="task?.task_id"
          :taskId="task.task_id"
          :creatorId="task.created_by"
          :assignedToId="task.assigned_to"
          @members-updated="handleMembersUpdated"
        />

        <div v-if="showSummary && hasErrors" class="error-summary">
          ⚠️ Bitte korrigiere die markierten Fehler
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="isTaskLocked">
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
import { reactive, ref, computed } from 'vue';
import { useTaskValidation } from '@/composables/useTaskValidation';
import TaskTemplateSelector from '@/components/tasks/TaskTemplateSelector.vue';
import SubtaskBuilder from '@/components/tasks/SubtaskBuilder.vue';
import TaskMembersList from '@/components/tasks/TaskMembersList.vue';
import { useTaskStore } from '@/stores/entities/taskStore';

const props = defineProps({
  task: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['save', 'save-with-subtasks', 'close']);
const taskStore = useTaskStore();

const {
  errors,
  warnings,
  hasErrors,
  validateTitle,
  validateDescription,
  validateDeadline,
  validateStatusProgress,
  validateAll
} = useTaskValidation(props.existingTasks)

/**
 * Feature #27: Überprüfe ob Task blockiert ist
 */
const isTaskLocked = computed(() => props.task?.is_locked);
const lockedReason = computed(() => {
  if (!props.task?.locked_reason) return 'System';
  if (props.task.locked_reason === 'OVERDUE') return 'Überfällig - automatisch gesperrt';
  if (props.task.locked_reason === 'MANUAL') return 'Manuell gesperrt';
  return props.task.locked_reason;
});

function formatForInput(isoString) {
  if (!isoString) return '';
  // Konvertiere ISO-String zu datetime-local Format (YYYY-MM-DDTHH:mm)
  // ohne lokale Zeitzonenverschiebung
  const date = new Date(isoString);
  return date.toISOString().slice(0, 16);
}

function formatForSubmit(datetimeLocal) {
  if (!datetimeLocal) return null;
  // Konvertiere datetime-local Format zu ISO-String mit Timezone
  // datetime-local Format ist YYYY-MM-DDTHH:mm und wird als UTC interpretiert
  const date = new Date(`${datetimeLocal}:00.000Z`);
  return date.toISOString();
}

const formData = reactive({
  title: props.task?.title || '',
  description: props.task?.description || '',
  deadline: formatForInput(props.task?.deadline) || '',
  priority_id: props.task?.priority_id || 2,
  status: props.task?.status || 'TODO',
  progress: props.task?.progress || 0
});

const subtasks = ref(
  props.task?.task_id ? taskStore.getSubtasks(props.task.task_id).map(st => ({
    task_id: st.task_id,
    title: st.title,
    priority_id: st.priority_id,
    status: st.status,
    progress: st.progress
  })) : []
);

const showSummary = ref(false);

const applyTemplate = (template) => {
  if (template.default_title) { formData.title = template.default_title; }
  if (template.default_description) { formData.description = template.default_description; }
  if (template.default_priority_id) { formData.priority_id = template.default_priority_id; }
  if (template.default_deadline_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + template.default_deadline_days);
    formData.deadline = formatForInput(futureDate.toISOString());
  }
};

const submitTask = () => {
  showSummary.value = true;

  console.log('📝 submitTask: Validierung wird gestartet...');
  if (!validateAll(formData, props.task?.task_id)) { 
    console.error('❌ Validierung fehlgeschlagen:', errors);
    return; 
  }

  console.log('✓ Validierung erfolgreich');
  const taskData = {
    title: formData.title,
    description: formData.description || '',
    deadline: formData.deadline ? formatForSubmit(formData.deadline) : null,
    priority_id: formData.priority_id || 2,
    status: formData.status || 'TODO',
    progress: formData.progress ?? 0,
    ...(props.task?.task_id && { task_id: props.task.task_id })
  };

  console.log('📤 Task-Daten zum Speichern (final):', taskData);
  console.log('📤 Subtasks:', subtasks.value);

  if (subtasks.value.length > 0) {
    console.log('💾 Speichere Task MIT Subtasks...');
    emit('save-with-subtasks', { taskData, subtasks: subtasks.value });
  } else {
    console.log('💾 Speichere Task ohne Subtasks...');
    emit('save', taskData);
  }

  showSummary.value = false;
};

const close = () => {
  emit('close');
};

const handleMembersUpdated = (members) => {
  // Optional: Handle members update if needed
  // For now, just log it
  console.log('Members updated:', members);
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

.has-error input,
.has-error select,
.has-error textarea {
  border-color: #ef4444;
}

.error-message {
  display: block;
  margin-top: 4px;
  color: #ef4444;
  font-size: 0.875rem;
}

.warning-message {
  display: block;
  margin-top: 4px;
  color: #f59e0b;
  font-size: 0.875rem;
}

.info-message {
  display: block;
  margin-top: 4px;
  color: #3b82f6;
  font-size: 0.875rem;
}

.required-star {
  color: #ef4444;
}

.error-summary {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-weight: 600;
}

/* Feature #27: Task Lock Styling */
.lock-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
  border-left: 4px solid #d97706;
  padding: 12px 16px;
  margin: 0 20px 16px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #92400e;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-form.is-locked {
  opacity: 0.85;
  background-color: #fafaf9;
}

.task-form.is-locked input:disabled,
.task-form.is-locked textarea:disabled,
.task-form.is-locked select:disabled {
  background-color: #f5f5f4;
  color: #78716c;
  cursor: not-allowed;
  border-color: #e7e5e4;
}

.task-form.is-locked button[type="submit"]:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
}

.task-form.is-locked button[type="submit"]:disabled:hover {
  background-color: #d1d5db;
}

:global(body.dark-mode) .modal-content,
:global(.app-container.dark-mode) .modal-content {
  background: #1f2333 !important;
  color: #edf0fa !important;
  border: 1px solid #434963 !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45) !important;
}

:global(body.dark-mode) .modal-header,
:global(.app-container.dark-mode) .modal-header {
  background: #1f2333 !important;
  border-bottom: 1px solid #434963 !important;
}

:global(body.dark-mode) .modal-header h2,
:global(.app-container.dark-mode) .modal-header h2,
:global(body.dark-mode) .form-group label,
:global(.app-container.dark-mode) .form-group label,
:global(body.dark-mode) .progress-label,
:global(.app-container.dark-mode) .progress-label {
  color: #edf0fa !important;
}

:global(body.dark-mode) .close-btn,
:global(.app-container.dark-mode) .close-btn {
  background: #3c415b !important;
  border-radius: 6px !important;
  color: #cfd5e6 !important;
}

:global(body.dark-mode) .close-btn:hover,
:global(.app-container.dark-mode) .close-btn:hover {
  background: #4a5070 !important;
  color: #ffffff !important;
}

:global(body.dark-mode) .form-group input,
:global(body.dark-mode) .form-group select,
:global(body.dark-mode) .form-group textarea,
:global(.app-container.dark-mode) .form-group input,
:global(.app-container.dark-mode) .form-group select,
:global(.app-container.dark-mode) .form-group textarea {
  background: #31364d !important;
  border-color: #59607d !important;
  color: #f5f7ff !important;
}

:global(body.dark-mode) .form-group input::placeholder,
:global(body.dark-mode) .form-group textarea::placeholder,
:global(.app-container.dark-mode) .form-group input::placeholder,
:global(.app-container.dark-mode) .form-group textarea::placeholder {
  color: #b2b9cb !important;
}

:global(body.dark-mode) .form-group input:disabled,
:global(body.dark-mode) .form-group select:disabled,
:global(body.dark-mode) .form-group textarea:disabled,
:global(.app-container.dark-mode) .form-group input:disabled,
:global(.app-container.dark-mode) .form-group select:disabled,
:global(.app-container.dark-mode) .form-group textarea:disabled {
  background: #2b3044 !important;
  color: #c7cede !important;
  border-color: #474d66 !important;
}

:global(body.dark-mode) .btn-secondary,
:global(.app-container.dark-mode) .btn-secondary {
  background: #39405a !important;
  color: #edf0fa !important;
}

:global(body.dark-mode) .btn-secondary:hover,
:global(.app-container.dark-mode) .btn-secondary:hover {
  background: #48506f !important;
}

:global(body.dark-mode) .error-summary,
:global(.app-container.dark-mode) .error-summary {
  background: #482b2f !important;
  color: #ffb4b4 !important;
}

:global(body.dark-mode) .info-message,
:global(.app-container.dark-mode) .info-message {
  color: #93b7ff !important;
}

:global(body.dark-mode) .warning-message,
:global(.app-container.dark-mode) .warning-message {
  color: #f5c56f !important;
}

:global(body.dark-mode) .task-form.is-locked,
:global(.app-container.dark-mode) .task-form.is-locked {
  background-color: #1f2333 !important;
}

:global(body.dark-mode) .task-form,
:global(.app-container.dark-mode) .task-form {
  background: #1f2333 !important;
}

:global(body.dark-mode) .subtask-builder,
:global(.app-container.dark-mode) .subtask-builder,
:global(body.dark-mode) .subtask-item,
:global(.app-container.dark-mode) .subtask-item {
  background: #2a2f45 !important;
}

:global(body.dark-mode) .task-form.is-locked button[type="submit"]:disabled,
:global(.app-container.dark-mode) .task-form.is-locked button[type="submit"]:disabled {
  background-color: #59607d !important;
  color: #d7dced !important;
}

:global(body.dark-mode) .lock-warning,
:global(.app-container.dark-mode) .lock-warning {
  background: linear-gradient(135deg, #6d4b00 0%, #9f6f00 100%) !important;
  color: #fff3c4 !important;
  border-left-color: #ffd166 !important;
}
</style>

<style>
body.dark-mode .task-form-overlay .task-form-modal,
.app-container.dark-mode .task-form-overlay .task-form-modal {
  background: #1f2333 !important;
  border: 1px solid #434963 !important;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55) !important;
  color: #edf0fa !important;
}

body.dark-mode .task-form-overlay .modal-header,
.app-container.dark-mode .task-form-overlay .modal-header,
body.dark-mode .task-form-overlay .task-form,
.app-container.dark-mode .task-form-overlay .task-form {
  background: #1f2333 !important;
}

body.dark-mode .task-form-overlay .modal-header,
.app-container.dark-mode .task-form-overlay .modal-header {
  border-bottom: 1px solid #434963 !important;
}

body.dark-mode .task-form-overlay .modal-header h2,
.app-container.dark-mode .task-form-overlay .modal-header h2,
body.dark-mode .task-form-overlay .form-group label,
.app-container.dark-mode .task-form-overlay .form-group label,
body.dark-mode .task-form-overlay .progress-label,
.app-container.dark-mode .task-form-overlay .progress-label {
  color: #edf0fa !important;
}

body.dark-mode .task-form-overlay .close-btn,
.app-container.dark-mode .task-form-overlay .close-btn {
  background: #3c415b !important;
  color: #ffffff !important;
}

body.dark-mode .task-form-overlay .close-btn:hover,
.app-container.dark-mode .task-form-overlay .close-btn:hover {
  background: #4a5070 !important;
}

body.dark-mode .task-form-overlay .form-group input,
body.dark-mode .task-form-overlay .form-group select,
body.dark-mode .task-form-overlay .form-group textarea,
.app-container.dark-mode .task-form-overlay .form-group input,
.app-container.dark-mode .task-form-overlay .form-group select,
.app-container.dark-mode .task-form-overlay .form-group textarea {
  background: #31364d !important;
  border: 1px solid #59607d !important;
  color: #f5f7ff !important;
}

body.dark-mode .task-form-overlay .subtask-builder,
body.dark-mode .task-form-overlay .task-members-section,
.app-container.dark-mode .task-form-overlay .subtask-builder,
.app-container.dark-mode .task-form-overlay .task-members-section {
  background: #262b3f !important;
  border: 1px solid #59607d !important;
}
</style>