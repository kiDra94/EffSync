<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content grade-modal">
      <div class="modal-header">
        <h2>Bewertung für: {{ task.title }}</h2>
        <button @click="handleClose" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="feedback">Feedback / Notiz:</label>
          <textarea 
            id="feedback"
            v-model="form.feedback" 
            placeholder="Schreibe dein Feedback für den Schüler..."
            class="feedback-textarea"
            rows="8"
          ></textarea>
          <p class="char-count">{{ form.feedback.length }} / 2000 Zeichen</p>
        </div>

        <div class="form-group">
          <label for="grade">Punkte/Note (optional):</label>
          <div class="grade-input-group">
            <input 
              id="grade"
              v-model="form.grade" 
              type="number" 
              placeholder="z.B. 85 oder 1.5"
              class="grade-input"
              min="0"
              step="0.5"
            />
            <span class="grade-hint">/100 oder Schulnoten</span>
          </div>
        </div>

        <div v-if="task.created_by_user" class="student-info">
          <p><strong>Schüler:</strong> {{ task.created_by_user.first_name }} {{ task.created_by_user.last_name }}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" class="btn-secondary">
          Abbrechen
        </button>
        <button 
          @click="handleSubmit" 
          class="btn-primary"
          :disabled="isSubmitting || !form.feedback.trim()"
        >
          {{ isSubmitting ? 'Speichern...' : '✓ Speichern' }}
        </button>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { createNote } from '@/api/notes';
import { useAuthStore } from '@/stores/authStore';

export default {
  name: 'GradeModal',
  props: {
    task: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const authStore = useAuthStore();
    const form = ref({
      feedback: '',
      grade: ''
    });

    const isSubmitting = ref(false);
    const errorMessage = ref('');
    const successMessage = ref('');

    const handleSubmit = async () => {
      errorMessage.value = '';
      successMessage.value = '';

      if (!form.value.feedback.trim()) {
        errorMessage.value = 'Bitte schreibe ein Feedback!';
        return;
      }

      try {
        isSubmitting.value = true;

        const noteData = {
          title: `Bewertung: ${props.task.title}`,
          description: form.value.feedback,
          subject_id: props.task.subject_id || undefined,
          task_id: props.task.task_id,
          priority_id: form.value.grade ? parseInt(form.value.grade) : undefined,
          created_by: authStore.userId
        };

        await createNote(noteData);

        successMessage.value = '✓ Bewertung gespeichert!';
        
        setTimeout(() => {
          emit('saved');
          emit('close');
        }, 1000);
      } catch (error) {
        console.error('Fehler beim Speichern der Bewertung:', error);
        errorMessage.value = error.response?.data?.message || 'Fehler beim Speichern der Bewertung.';
      } finally {
        isSubmitting.value = false;
      }
    };

    const handleClose = () => {
      emit('close');
    };

    return {
      form,
      isSubmitting,
      errorMessage,
      successMessage,
      handleSubmit,
      handleClose
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content.grade-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
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
  font-size: 1.5rem;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
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
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 20px;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
}

.feedback-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.char-count {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 4px;
}

.grade-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.grade-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.grade-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.grade-hint {
  color: #6b7280;
  font-size: 0.875rem;
  white-space: nowrap;
}

.student-info {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  margin-top: 20px;
  border-left: 4px solid #3b82f6;
}

.student-info p {
  margin: 0;
  color: #374151;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.error-message {
  padding: 12px 20px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin: 12px 20px 0;
  border-left: 4px solid #dc2626;
}

.success-message {
  padding: 12px 20px;
  background: #dcfce7;
  color: #166534;
  border-radius: 6px;
  margin: 12px 20px 0;
  border-left: 4px solid #22c55e;
}
</style>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content.grade-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
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
  font-size: 1.5rem;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
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
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 20px;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
}

.feedback-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.char-count {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 4px;
}

.grade-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.grade-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.grade-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.grade-hint {
  color: #6b7280;
  font-size: 0.875rem;
  white-space: nowrap;
}

.student-info {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  margin-top: 20px;
  border-left: 4px solid #3b82f6;
}

.student-info p {
  margin: 0;
  color: #374151;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.error-message {
  padding: 12px 20px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin: 12px 20px 0;
  border-left: 4px solid #dc2626;
}

.success-message {
  padding: 12px 20px;
  background: #dcfce7;
  color: #166534;
  border-radius: 6px;
  margin: 12px 20px 0;
  border-left: 4px solid #22c55e;
}
</style>
