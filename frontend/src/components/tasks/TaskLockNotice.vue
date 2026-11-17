<script setup>
import { ref, computed } from 'vue';
import { useTaskStore } from '@/stores/entities/taskStore';

// Feature #27: why a task is locked, and for its creator the unlock with a
// new deadline (Definition of done: out of TaskForm)
const props = defineProps({
  task: { type: Object, required: true },
  canUnlock: { type: Boolean, default: false },
});
const emit = defineEmits(['unlocked']);

const taskStore = useTaskStore();
const showUnlockDialog = ref(false);
const newDeadline = ref('');

const lockedReason = computed(() => {
  if (props.task.is_student_submission_locked) {
    const grade = props.task.student_submission_status?.latest_grade;
    return `Deine Eingabe wurde bewertet${grade ? ` (${grade})` : ''}. Du darfst nicht weiter bearbeiten bis ein neues Deadline gesetzt wird.`;
  }
  if (!props.task.locked_reason) return 'System';
  if (props.task.locked_reason === 'OVERDUE') return 'Überfällig - automatisch gesperrt';
  if (props.task.locked_reason === 'MANUAL') return 'Manuell gesperrt';
  return props.task.locked_reason;
});

const unlockTask = async () => {
  if (!props.task.task_id || !newDeadline.value) {
    alert('Bitte wähle ein neues Deadline-Datum aus.');
    return;
  }
  try {
    // the datetime-local value is read as UTC, like the form's deadline
    const isoDeadline = new Date(`${newDeadline.value}:00.000Z`).toISOString();
    // the store reloads the tasks
    await taskStore.unlockWithDeadline(props.task.task_id, isoDeadline);
    alert('✓ Task wurde erfolgreich entsperrt und das neue Deadline wurde gesetzt!');
    showUnlockDialog.value = false;
    newDeadline.value = '';
    emit('unlocked');
  } catch (error) {
    console.error('Fehler beim Entsperren des Tasks:', error);
    alert(`Fehler: ${error.response?.data?.message || error.message}`);
  }
};
</script>

<template>
  <div class="task-lock-notice">
    <div class="lock-warning">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>🔒 <strong>Aufgabe gesperrt:</strong> {{ lockedReason }}</span>
        <button v-if="canUnlock" type="button" class="btn-unlock-small" @click="showUnlockDialog = true">
          🔓 Entsperren
        </button>
      </div>
    </div>

    <div v-if="showUnlockDialog && canUnlock" class="unlock-dialog">
      <h3>🔓 Aufgabe entsperren</h3>
      <p>Setze ein neues Deadline-Datum, um die Aufgabe freizugeben:</p>
      <div class="form-group">
        <label for="unlock-deadline">Neues Deadline *</label>
        <input type="datetime-local" v-model="newDeadline" id="unlock-deadline" required />
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
  </div>
</template>

<style scoped>
/* the form's field and button styles the dialog uses (scoped styles don't
   reach into a child component) */
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

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4f46e5;
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
</style>
