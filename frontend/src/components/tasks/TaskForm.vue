<template>
  <div class="modal-overlay task-form-overlay" @click.self="close">
    <div class="modal-content task-form-modal">
      <div class="modal-header">
        <h2>{{ task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <!-- Feature #27: why the task is locked, and the creator's unlock -->
      <TaskLockNotice v-if="isTaskLocked" :task="task" :can-unlock="canUnlockTask" @unlocked="close" />

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
            <option v-for="priority in PRIORITIES" :key="priority.id" :value="priority.id">{{ priority.label }}</option>
          </select>
        </div>

        <div class="form-group" :class="{ 'has-error': errors.deadline }">
          <label for="deadline">Deadline *</label>
          <input type="datetime-local" v-model="formData.deadline" id="deadline" @blur="validateDeadline(formData.deadline)"
            @change="validateDeadline(formData.deadline)" :disabled="isTaskLocked" />
          <span v-if="errors.deadline" class="error-message">{{ errors.deadline }}</span>
          <span v-if="warnings.deadline" class="warning-message">{{ warnings.deadline }}</span>
        </div>

        <!-- T59 (M18, decision Q8e): tags, comma-separated -->
        <div class="form-group">
          <label for="tags">Tags</label>
          <input v-model="formData.tags" id="tags" type="text" placeholder="z.B. Mathe, Projekt" :disabled="isTaskLocked" />
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
          <span v-else-if="warnings.status" class="warning-message">{{ warnings.status }}</span>
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

        <SubtaskBuilder v-if="canAddSubtasks" v-model="subtasks" />

        <div v-if="!task" class="form-group">
          <label for="creation-members">Zusätzliche Mitglieder (optional)</label>
          <select
            id="creation-members"
            v-model="creationMembers"
            class="member-multiselect"
            multiple
            :disabled="isTaskLocked || isLoadingUsers"
          >
            <option
              v-for="user in selectableUsers"
              :key="user.user_id"
              :value="user.user_id"
            >
              {{ user.firstname }} {{ user.lastname }} ({{ user.email }})
            </option>
          </select>
          <span class="info-message">
            Ausgewählte Benutzer werden direkt nach dem Erstellen als Mitglieder hinzugefügt.
          </span>

          <TaskMemberChips v-if="selectedMembersForDisplay.length > 0" :members="selectedMembersForDisplay"
            @remove="removeMember" />
        </div>

        <!-- Task members section (only if the task already exists) -->
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
          <!-- T110 (M18): save the task as a template (name and description, decision H2) -->
          <button type="button" class="btn-secondary" data-test="save-as-template"
            :disabled="!formData.title" @click="saveAsTemplate">
            Als Vorlage speichern
          </button>
          <span v-if="templateMessage" class="info-message">{{ templateMessage }}</span>
        </div>
      </form>

      <!-- T09, T74, decision Q16 (M27): outside the form, they send on their own -->
      <div v-if="task?.task_id" class="task-discussion">
        <TaskGradeRemarks :taskId="task.task_id" :canWrite="isTeacher" />
        <TaskComments :taskId="task.task_id" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useTaskValidation } from '@/composables/useTaskValidation';
import TaskTemplateSelector from '@/components/tasks/TaskTemplateSelector.vue';
import { useTemplateStore } from '@/stores/entities/templateStore';
import { PRIORITIES } from '@/config/priorities';
import SubtaskBuilder from '@/components/tasks/SubtaskBuilder.vue';
import TaskMembersList from '@/components/tasks/TaskMembersList.vue';
import TaskComments from '@/components/tasks/TaskComments.vue';
import TaskGradeRemarks from '@/components/tasks/TaskGradeRemarks.vue';
import TaskLockNotice from '@/components/tasks/TaskLockNotice.vue';
import TaskMemberChips from '@/components/tasks/TaskMemberChips.vue';
import { useTaskStore } from '@/stores/entities/taskStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/entities/userStore';

// M25 (decision Q19): data through stores, not the api/ layer
const userStore = useUserStore();
const props = defineProps({
  task: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['save', 'save-with-subtasks', 'close']);
const taskStore = useTaskStore();
const authStore = useAuthStore();

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
 * Feature #27: task locking - per student, not global
 * A task is locked only FOR THIS STUDENT once THEIR document was graded
 */
const isTaskLocked = computed(() => {
  // Use the new per-student lock info from the backend
  if (props.task?.is_student_submission_locked) {
    return true;
  }
  // Fall back to the global lock (for creators/teachers who lock the task manually)
  return props.task?.is_locked && props.task?.created_by === authStore.userId;
});

const isTaskCreator = computed(() => props.task?.created_by === authStore.userId);
const isTeacher = computed(() => ['teacher', 'admin', 'superuser'].includes((authStore.userRole || '').toLowerCase()));
// T41, decision Q2 (M16): the backend lets only the root task's creator,
// assignee and members add subtasks, so the builder shows only for them; a
// new task starts a project of its own
const rootTask = computed(() => {
  let task = props.task;
  const seen = new Set();
  while (task?.parent_task_id && !seen.has(task.task_id)) {
    seen.add(task.task_id);
    const parent = (taskStore.tasks || []).find((t) => String(t.task_id) === String(task.parent_task_id));
    if (!parent) break;
    task = parent;
  }
  return task;
});
const isInvolvedInRoot = computed(() => {
  const root = rootTask.value;
  const userId = String(authStore.userId);
  const members = Array.isArray(root?.task_members) ? root.task_members : [];
  return [root?.created_by, root?.assigned_to, ...members.map((m) => m?.user_id)]
    .some((id) => id != null && String(id) === userId);
});
const canAddSubtasks = computed(() => (props.task?.task_id ? isInvolvedInRoot.value : true));
const canUnlockTask = computed(() => isTaskLocked.value && isTaskCreator.value);

function formatForInput(isoString) {
  if (!isoString) return '';
  // Convert an ISO string to the datetime-local format (YYYY-MM-DDTHH:mm)
  // without a local time zone shift
  const date = new Date(isoString);
  return date.toISOString().slice(0, 16);
}

function formatForSubmit(datetimeLocal) {
  if (!datetimeLocal) return null;
  // Convert the datetime-local format to an ISO string with time zone
  // the datetime-local format is YYYY-MM-DDTHH:mm and is read as UTC
  const date = new Date(`${datetimeLocal}:00.000Z`);
  return date.toISOString();
}

const formData = reactive({
  title: props.task?.title || '',
  description: props.task?.description || '',
  deadline: formatForInput(props.task?.deadline) || '',
  priority_id: props.task?.priority_id || 2,
  status: props.task?.status || 'TODO',
  progress: props.task?.progress || 0,
  // T59 (M18): the tag names, edited as one comma-separated text
  tags: (props.task?.task_tags || []).map((t) => t.tags?.name).filter(Boolean).join(', '),
  // T110 (M18): the template the new task is created from
  template_id: null
});

// an update replaces the tags, so they are sent only after a change (M18)
const initialTags = formData.tags;

const parseTags = (text) =>
  String(text || '').split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);

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
const creationMembers = ref([]);
const selectableUsers = ref([]);
const isLoadingUsers = ref(false);

onMounted(async () => {
  if (props.task?.task_id) {
    return;
  }

  try {
    isLoadingUsers.value = true;
    const response = await userStore.fetchAll();
    const users = response?.data?.data ?? response?.data ?? [];
    selectableUsers.value = Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer für Task-Mitglieder:', error);
    selectableUsers.value = [];
  } finally {
    isLoadingUsers.value = false;
  }
});

// T110 (07_…:225, decision H2): the template fills title and description;
// the user sets deadline, priority and assignee
const applyTemplate = (template) => {
  // "Keine Vorlage": the link goes, what the user typed stays
  if (!template) {
    formData.template_id = null;
    return;
  }
  formData.title = template.name || '';
  formData.description = template.description || '';
  formData.template_id = template.template_id ?? null;
};

const templateMessage = ref('');
const saveAsTemplate = async () => {
  try {
    // the store only when it's needed, so the form works without templates
    await useTemplateStore().addTemplate({ name: formData.title, description: formData.description || '' });
    templateMessage.value = 'Als Vorlage gespeichert';
  } catch {
    templateMessage.value = 'Vorlage konnte nicht gespeichert werden';
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
    ...(formData.tags !== initialTags && { tags: parseTags(formData.tags) }),
    ...(formData.template_id && { template_id: formData.template_id }),
    ...(props.task?.task_id && { task_id: props.task.task_id })
  };

  if (!props.task?.task_id && creationMembers.value.length > 0) {
    taskData.member_user_ids = creationMembers.value.map((id) => Number(id));
  }

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

/**
 * Shows the selected members as chips
 */
const selectedMembersForDisplay = computed(() => {
  return creationMembers.value
    .map((userId) => selectableUsers.value.find((u) => u.user_id === Number(userId)))
    .filter(Boolean);
});

const removeMember = (userId) => {
  creationMembers.value = creationMembers.value.filter((id) => Number(id) !== Number(userId));
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

.task-discussion {
  padding: 0 24px 24px;
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

.member-multiselect {
  min-height: 130px;
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