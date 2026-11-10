<template>
  <div class="modal-overlay task-form-overlay" @click.self="close">
    <div class="modal-content task-form-modal">
      <div class="modal-header">
        <h2>{{ task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <!-- Feature #27: Display lock warning -->
      <div v-if="isTaskLocked" class="lock-warning">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>🔒 <strong>Aufgabe gesperrt:</strong> {{ lockedReason }}</span>
          <button 
            v-if="canUnlockTask" 
            type="button" 
            class="btn-unlock-small"
            @click="showUnlockDialog = true"
          >
            🔓 Entsperren
          </button>
        </div>
      </div>

      <!-- Feature #27: Unlock Dialog -->
      <div v-if="showUnlockDialog && canUnlockTask" class="unlock-dialog">
        <h3>🔓 Aufgabe entsperren</h3>
        <p>Setze ein neues Deadline-Datum, um die Aufgabe freizugeben:</p>
        <div class="form-group">
          <label for="unlock-deadline">Neues Deadline *</label>
          <input 
            type="datetime-local" 
            v-model="newDeadlineForUnlock" 
            id="unlock-deadline"
            required
          />
        </div>
        <div class="unlock-dialog-actions">
          <button type="button" class="btn-primary" @click="unlockTask">
            ✓ Entsperren & Speichern
          </button>
          <button type="button" class="btn-secondary" @click="showUnlockDialog = false">
            Abbrechen
          </button>
        </div>
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

          <!-- Show selected members as chips -->
          <div v-if="selectedMembersForDisplay.length > 0" class="selected-members-chips">
            <div
              v-for="member in selectedMembersForDisplay"
              :key="member.user_id"
              class="member-chip"
              :title="`${member.firstname} ${member.lastname} (${member.email})`"
            >
              <span class="chip-avatar">{{ getInitials(member.firstname, member.lastname) }}</span>
              <span class="chip-name">{{ member.firstname }} {{ member.lastname }}</span>
              <button
                type="button"
                class="chip-remove"
                @click="removeMember(member.user_id)"
                aria-label="Member entfernen"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Task members section (only if the task already exists) -->
        <TaskMembersList
          v-if="task?.task_id && canManageTaskStructure"
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
const canManageTaskStructure = computed(() => {
  if (!props.task?.task_id) {
    return isTeacher.value;
  }

  return isTeacher.value || isTaskCreator.value;
});
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

const lockedReason = computed(() => {
  if (props.task?.is_student_submission_locked) {
    const grade = props.task?.student_submission_status?.latest_grade;
    return `Deine Eingabe wurde bewertet${grade ? ` (${grade})` : ''}. Du darfst nicht weiter bearbeiten bis ein neues Deadline gesetzt wird.`;
  }
  
  if (!props.task?.locked_reason) return 'System';
  if (props.task.locked_reason === 'OVERDUE') return 'Überfällig - automatisch gesperrt';
  if (props.task.locked_reason === 'MANUAL') return 'Manuell gesperrt';
  return props.task.locked_reason;
});

// State for the unlock dialog
const showUnlockDialog = ref(false);
const newDeadlineForUnlock = ref('');

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

/**
 * Feature #27: unlocks a locked task with a new deadline
 */
const unlockTask = async () => {
  if (!props.task?.task_id || !newDeadlineForUnlock.value) {
    alert('Bitte wähle ein neues Deadline-Datum aus.');
    return;
  }

  try {
    // Convert datetime-local to ISO format
    const date = new Date(`${newDeadlineForUnlock.value}:00.000Z`);
    const isoDeadline = date.toISOString();

    // the store reloads the tasks
    await taskStore.unlockWithDeadline(props.task.task_id, isoDeadline);
    alert('✓ Task wurde erfolgreich entsperrt und das neue Deadline wurde gesetzt!');
    
    // Close the dialog
    showUnlockDialog.value = false;
    newDeadlineForUnlock.value = '';
    
    // Close the task form modal
    close();
  } catch (error) {
    console.error('Fehler beim Entsperren des Tasks:', error);
    alert(`Fehler: ${error.response?.data?.message || error.message}`);
  }
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

const getInitials = (firstname, lastname) => {
  return `${(firstname || 'U')[0]}${(lastname || 'S')[0]}`.toUpperCase();
};

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

/* Feature #27: Unlock Styles */
.btn-unlock-small {
  padding: 6px 12px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-unlock-small:hover {
  background-color: #059669;
  transform: translateY(-1px);
}

.unlock-dialog {
  background-color: #ecfdf5;
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.unlock-dialog h3 {
  margin-top: 0;
  color: #047857;
  margin-bottom: 8px;
}

.unlock-dialog p {
  color: #065f46;
  margin: 8px 0 16px 0;
}

.unlock-dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.unlock-dialog-actions .btn-primary,
.unlock-dialog-actions .btn-secondary {
  flex: 1;
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

/* Selected Members Chips Styling */
.selected-members-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background-color: #f0f9ff;
  border: 1px dashed #0ea5e9;
  border-radius: 6px;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  border: 1px solid #0ea5e9;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.member-chip:hover {
  background-color: #e0f2fe;
  box-shadow: 0 2px 4px rgba(6, 182, 212, 0.2);
}

.chip-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.chip-name {
  color: #0c4a6e;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  transition: all 0.2s;
  flex-shrink: 0;
}

.chip-remove:hover {
  color: #dc2626;
  transform: scale(1.2);
}

/* Dark mode for member chips */
:global(body.dark-mode) .selected-members-chips,
:global(.app-container.dark-mode) .selected-members-chips {
  background-color: #0e2f47 !important;
  border-color: #0ea5e9 !important;
}

:global(body.dark-mode) .member-chip,
:global(.app-container.dark-mode) .member-chip {
  background-color: #1a3a4a !important;
  border-color: #0ea5e9 !important;
}

:global(body.dark-mode) .member-chip:hover,
:global(.app-container.dark-mode) .member-chip:hover {
  background-color: #164e63 !important;
}

:global(body.dark-mode) .chip-name,
:global(.app-container.dark-mode) .chip-name {
  color: #38bdf8 !important;
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