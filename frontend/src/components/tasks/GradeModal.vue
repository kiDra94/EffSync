<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content grade-modal">
      <div class="modal-header">
        <h2>Dokument bewerten: {{ task.title }}</h2>
        <button @click="handleClose" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <div class="modal-body">
        <!-- Loading State -->
        <div v-if="isLoadingDocuments" class="loading-state">
          <p>Verknüpfte Dokumente werden geladen...</p>
        </div>

        <!-- No Documents -->
        <div v-else-if="linkedDocuments.length === 0" class="no-documents">
          <p>⚠️ Keine Dokumente mit dieser Task verknüpft.</p>
          <p class="hint">Schüler müssen zuerst ein Dokument hochladen.</p>
        </div>

        <!-- Document Selection -->
        <div v-else class="form-group">
          <label for="document-select">Dokument:</label>
          <select v-model="selectedDocumentId" id="document-select" class="document-select">
            <option v-for="doc in linkedDocuments" :key="doc.document_id" :value="doc.document_id">
              {{ doc.name }} ({{ doc.mime_type }})
            </option>
          </select>
        </div>

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
              type="text" 
              placeholder="z.B. 85, 1.5 oder Sehr gut"
              class="grade-input"
            />
          </div>
        </div>

        <div class="info-box">
          <strong>ℹ️ Hinweis:</strong> Nach der Bewertung wird dieser Task für den Schüler automatisch gesperrt.
          Der Schüler kann ihn nur bearbeiten, wenn du ein neues Abgabedatum setzt.
        </div>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" class="btn-secondary">
          Abbrechen
        </button>
        <button 
          @click="handleSubmit" 
          class="btn-primary"
          :disabled="isSubmitting || linkedDocuments.length === 0 || (!form.feedback.trim() && !form.grade.trim())"
        >
          {{ isSubmitting ? 'Speichern...' : '✓ Speichern & Sperren' }}
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
import { ref, onMounted } from 'vue';
import { useDocumentStore } from '@/stores/entities/documentStore';

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
    // M25 (decision Q19): data through the store, not the api/ layer
    const documentStore = useDocumentStore();
    const form = ref({
      feedback: '',
      grade: ''
    });

    const isSubmitting = ref(false);
    const errorMessage = ref('');
    const successMessage = ref('');
    const linkedDocuments = ref([]);
    const selectedDocumentId = ref(null);
    const isLoadingDocuments = ref(true);

    // Load the documents linked to this task
    const loadLinkedDocuments = async () => {
      try {
        isLoadingDocuments.value = true;
        const allDocs = await documentStore.fetchDocuments();
        
        // Filter: only documents linked to the task
        linkedDocuments.value = allDocs.filter(doc => 
          doc.task_documents?.some(td => td.task_id === props.task.task_id)
        );

        if (linkedDocuments.value.length > 0) {
          selectedDocumentId.value = linkedDocuments.value[0].document_id;
        }
      } catch (error) {
        console.error('Fehler beim Laden der Dokumente:', error);
        errorMessage.value = 'Fehler beim Laden der verknüpften Dokumente.';
      } finally {
        isLoadingDocuments.value = false;
      }
    };

    const handleSubmit = async () => {
      errorMessage.value = '';
      successMessage.value = '';

      if (!selectedDocumentId.value) {
        errorMessage.value = 'Bitte wähle ein Dokument zum Bewerten aus.';
        return;
      }

      if (!form.value.feedback.trim() && !form.value.grade.trim()) {
        errorMessage.value = 'Bitte gib mindestens eine Note oder ein Feedback an!';
        return;
      }

      try {
        isSubmitting.value = true;

        // Send the grade to the backend, which releases or locks
        // the task automatically based on the grade
        await documentStore.gradeDocument(selectedDocumentId.value, {
          grade: form.value.grade.trim() || null,
          feedback: form.value.feedback.trim() || null,
        });

        successMessage.value = '✓ Dokument bewertet! Task wurde automatisch gesperrt.';
        
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

    onMounted(() => {
      loadLinkedDocuments();
    });

    return {
      form,
      isSubmitting,
      errorMessage,
      successMessage,
      handleSubmit,
      handleClose,
      linkedDocuments,
      selectedDocumentId,
      isLoadingDocuments,
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
