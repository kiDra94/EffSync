<template>
  <div class="document-view">
    <div class="document-header">
      <div>
        <h1>Dokumente</h1>
        <p class="subtitle">{{ roleHint }}</p>
      </div>

      <div v-if="canUpload" class="header-actions">
        <input
          ref="fileInput"
          type="file"
          class="hidden-input"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx,.ods,.odp"
          @change="handleFileUpload"
        />
        <button class="btn-primary" :disabled="isUploading" @click="triggerFileInput">
          {{ isUploading ? 'Wird hochgeladen…' : '+ Dokument hochladen' }}
        </button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="errorMessage" class="alert alert-error">
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="successMessage" class="alert alert-success">
        <span>✅</span>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <div class="upload-hint card">
      <strong>Upload-Regeln:</strong>
      Maximal 25 MB pro Datei. Erlaubte Formate: PDF, JPG/JPEG, PNG, GIF, BMP, WEBP,
      DOC/DOCX, ODT, RTF, TXT, MD, CSV, XLS/XLSX, PPT/PPTX, ODS, ODP.
    </div>

    <div v-if="canUpload" class="upload-context card">
      <div class="task-upload-row">
        <label for="document-task-select" class="field-label">Task-Verknüpfung (optional)</label>
        <select id="document-task-select" v-model="selectedTaskId" class="task-select">
          <option value="">Kein Task</option>
          <option v-for="task in taskOptions" :key="task.task_id" :value="String(task.task_id)">
            #{{ task.task_id }} · {{ task.title || 'Ohne Titel' }}
          </option>
        </select>
      </div>
      <p v-if="selectedTaskId" class="task-upload-hint">
        Upload wird mit Task #{{ selectedTaskId }} verknüpft.
      </p>
      <p class="task-upload-hint muted">
        Empfehlung: Lehrer erstellt eine Task mit Abgabehinweis. Schüler klicken dann auf 📎 beim Task oder laden hier mit Task-Verknüpfung hoch.
      </p>
    </div>

    <div class="document-container card">
      <div v-if="isLoading" class="state-panel">
        <div class="empty-icon">⏳</div>
        <p>Dokumente werden geladen…</p>
      </div>

      <div v-else-if="documents.length" class="table-wrapper">
        <table class="document-table">
          <thead>
            <tr>
              <th>Datei</th>
              <th>Typ</th>
              <th>Größe</th>
              <th>Hochgeladen von</th>
              <th>Bewertung</th>
              <th class="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="doc in documents" :key="doc.document_id">
              <tr>
                <td>
                  <div v-if="editingDocumentId === doc.document_id" class="rename-editor">
                    <input
                      v-model.trim="renameDrafts[doc.document_id]"
                      class="rename-input"
                      maxlength="255"
                      @keyup.enter="saveRename(doc)"
                    />
                    <div class="rename-actions">
                      <button class="btn-inline btn-save" @click="saveRename(doc)">Speichern</button>
                      <button class="btn-inline" @click="cancelRename">Abbrechen</button>
                    </div>
                  </div>
                  <div v-else class="file-cell">
                    <span class="file-name">{{ doc.name }}</span>
                    <span class="file-date">{{ formatDate(doc.created_at) }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge">{{ getSimpleType(doc.mime_type) }}</span>
                </td>
                <td class="text-muted">{{ formatBytes(doc.file_size) }}</td>
                <td>
                  <div class="uploader-cell">
                    <span>{{ getUploaderLabel(doc) }}</span>
                    <small class="text-muted">{{ getUploaderRole(doc) }}</small>
                  </div>
                </td>
                <td>
                  <div class="grade-cell">
                    <span
                      class="grade-badge"
                      :class="{ graded: doc.grade || doc.feedback, pending: !doc.grade && !doc.feedback }"
                    >
                      {{ getGradeSummary(doc) }}
                    </span>
                  </div>
                </td>
                <td class="text-right actions-cell">
                  <button class="btn-icon" title="Öffnen" @click="openDocument(doc)">
                    👁️
                  </button>
                  <button class="btn-icon" title="Herunterladen" @click="downloadDocument(doc)">⬇️</button>
                  <button
                    v-if="doc.permissions?.can_edit"
                    class="btn-icon"
                    title="Umbenennen"
                    @click="startRename(doc)"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="doc.permissions?.can_grade"
                    class="btn-icon"
                    title="Bewerten"
                    @click="openGradeDialog(doc)"
                  >
                    📝
                  </button>
                  <button
                    v-if="doc.permissions?.can_delete"
                    class="btn-icon btn-danger"
                    title="Löschen"
                    @click="deleteOwnDocument(doc)"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
              <DocumentGradeRow v-if="doc.grade || doc.feedback" :document="doc" />
            </template>
          </tbody>
        </table>
      </div>

      <div v-else class="state-panel">
        <div class="empty-icon">📂</div>
        <h3>Keine Dokumente vorhanden</h3>
        <p>{{ emptyStateText }}</p>
      </div>
    </div>

    <Transition name="fade">
      <DocumentGradeDialog v-if="gradeDocumentTarget" :document="gradeDocumentTarget" :saving="isSavingGrade"
        @close="closeGradeDialog" @save="saveGrade" />
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentStore } from '@/stores/entities/documentStore';
import { useTaskStore } from '@/stores/entities/taskStore';
import DocumentGradeDialog from '@/components/documents/DocumentGradeDialog.vue';
import DocumentGradeRow from '@/components/documents/DocumentGradeRow.vue';
import {
  validateFile,
  isPreviewable,
  simpleType as getSimpleType,
  formatBytes,
  formatDate,
  uploaderLabel as getUploaderLabel,
  uploaderRole as getUploaderRole,
  gradeSummary as getGradeSummary,
  fileNameFromResponse as getFileNameFromResponse,
  openBlob,
  saveBlob,
} from '@/components/documents/documentFiles';

// M25 (decision Q19): data through stores, not the api/ layer
const documentStore = useDocumentStore();
const taskStore = useTaskStore();
const authStore = useAuthStore();
const route = useRoute();

const documents = ref([]);
const tasks = ref([]);
const fileInput = ref(null);
const isLoading = ref(false);
const isUploading = ref(false);
const isSavingGrade = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const editingDocumentId = ref(null);
const renameDrafts = ref({});
const gradeDocumentTarget = ref(null);
const selectedTaskId = ref('');

// role names as in the backend's RoleName enum; German aliases are gone (decision Q10)
const normalizeRole = (role) => String(role || '').toLowerCase().trim();

const normalizedRole = computed(() => normalizeRole(authStore.userRole));
const canUpload = computed(() => ['student', 'teacher', 'admin', 'superuser'].includes(normalizedRole.value));

const roleHint = computed(() => {
  if (normalizedRole.value === 'student') {
    return 'Du siehst nur deine eigenen Uploads und darfst sie umbenennen oder löschen.';
  }

  if (['teacher', 'admin', 'superuser'].includes(normalizedRole.value)) {
    return 'Lehrkräfte sehen alle Uploads, können sie lesen, herunterladen und Schülerdokumente bewerten.';
  }

  return 'Dokumente lesen und herunterladen.';
});

const emptyStateText = computed(() => {
  return normalizedRole.value === 'student'
    ? 'Du hast noch kein Dokument hochgeladen.'
    : 'Es wurden noch keine Dokumente hochgeladen.';
});

const taskOptions = computed(() => {
  if (normalizedRole.value === 'student') {
    return tasks.value.filter((task) => {
      const ownTask = Number(task.assigned_to) === Number(authStore.userId);
      const createdByMe = Number(task.created_by) === Number(authStore.userId);
      const memberMatch = Array.isArray(task.task_members)
        && task.task_members.some((member) => Number(member.user_id) === Number(authStore.userId));

      return ownTask || createdByMe || memberMatch;
    });
  }

  return tasks.value;
});

const clearMessages = () => {
  errorMessage.value = '';
  successMessage.value = '';
};

const setSuccessMessage = (message) => {
  successMessage.value = message;
  window.setTimeout(() => {
    if (successMessage.value === message) {
      successMessage.value = '';
    }
  }, 3500);
};

const loadDocuments = async () => {
  isLoading.value = true;
  clearMessages();

  try {
    documents.value = await documentStore.fetchDocuments();
  } catch (error) {
    console.error('Fehler beim Laden der Dokumente:', error);
    errorMessage.value = error.response?.data?.message || 'Dokumente konnten nicht geladen werden.';
  } finally {
    isLoading.value = false;
  }
};

const loadTasksForUpload = async () => {
  try {
    await taskStore.getTasks();
    tasks.value = taskStore.tasks;
  } catch (error) {
    console.warn('Taskliste für Upload-Kontext konnte nicht geladen werden:', error?.message || error);
    tasks.value = [];
  }
};

onMounted(async () => {
  const queryTaskId = route.query?.taskId;
  if (typeof queryTaskId === 'string' && queryTaskId.trim()) {
    selectedTaskId.value = queryTaskId;
  }

  await Promise.all([
    loadDocuments(),
    loadTasksForUpload(),
  ]);
});

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0];
  clearMessages();

  const validationError = validateFile(file);
  if (validationError) {
    errorMessage.value = validationError;
    event.target.value = '';
    return;
  }

  try {
    isUploading.value = true;
    const created = await documentStore.uploadDocument(file, selectedTaskId.value || undefined);
    documents.value = [created, ...documents.value.filter((doc) => doc.document_id !== created.document_id)];
    setSuccessMessage('Dokument erfolgreich hochgeladen.');
  } catch (error) {
    console.error('Fehler beim Upload:', error);
    errorMessage.value = error.response?.data?.message || 'Upload fehlgeschlagen.';
  } finally {
    isUploading.value = false;
    event.target.value = '';
  }
};

const startRename = (document) => {
  clearMessages();
  editingDocumentId.value = document.document_id;
  renameDrafts.value = {
    ...renameDrafts.value,
    [document.document_id]: document.name,
  };
};

const cancelRename = () => {
  editingDocumentId.value = null;
};

const saveRename = async (document) => {
  const nextName = String(renameDrafts.value[document.document_id] || '').trim();

  if (!nextName) {
    errorMessage.value = 'Der Dateiname darf nicht leer sein.';
    return;
  }

  try {
    clearMessages();
    const updated = await documentStore.renameDocument(document.document_id, nextName);
    documents.value = documents.value.map((entry) =>
      entry.document_id === updated.document_id ? updated : entry,
    );
    editingDocumentId.value = null;
    setSuccessMessage('Dokumentname aktualisiert.');
  } catch (error) {
    console.error('Fehler beim Umbenennen:', error);
    errorMessage.value = error.response?.data?.message || 'Umbenennen fehlgeschlagen.';
  }
};

const openGradeDialog = (document) => {
  clearMessages();
  gradeDocumentTarget.value = document;
};

const closeGradeDialog = () => {
  gradeDocumentTarget.value = null;
};

// DocumentGradeDialog hands over what was entered
const saveGrade = async (gradeForm) => {
  if (!gradeDocumentTarget.value) {
    return;
  }

  if (!gradeForm.grade && !gradeForm.feedback) {
    errorMessage.value = 'Bitte trage mindestens eine Note oder ein Feedback ein.';
    return;
  }

  try {
    isSavingGrade.value = true;
    clearMessages();
    const updated = await documentStore.gradeDocument(gradeDocumentTarget.value.document_id, {
      grade: gradeForm.grade || undefined,
      feedback: gradeForm.feedback || undefined,
    });

    documents.value = documents.value.map((entry) =>
      entry.document_id === updated.document_id ? updated : entry,
    );
    closeGradeDialog();
    setSuccessMessage('Bewertung gespeichert. Der Schüler wurde benachrichtigt.');
  } catch (error) {
    console.error('Fehler beim Bewerten:', error);
    errorMessage.value = error.response?.data?.message || 'Bewertung konnte nicht gespeichert werden.';
  } finally {
    isSavingGrade.value = false;
  }
};

const deleteOwnDocument = async (document) => {
  const confirmed = window.confirm(`Dokument "${document.name}" wirklich löschen?`);
  if (!confirmed) {
    return;
  }

  try {
    clearMessages();
    await documentStore.deleteDocument(document.document_id);
    documents.value = documents.value.filter((entry) => entry.document_id !== document.document_id);
    setSuccessMessage('Dokument gelöscht.');
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    errorMessage.value = error.response?.data?.message || 'Dokument konnte nicht gelöscht werden.';
  }
};

const openDocument = async (document) => {
  try {
    clearMessages();
    const response = await documentStore.fetchDocumentBinary(document.document_id);
    const fileName = getFileNameFromResponse(response, document.name);
    const mimeType = String(response.data?.type || document.mime_type || '').toLowerCase();
    if (isPreviewable(mimeType)) {
      openBlob(response.data, fileName);
      return;
    }

    saveBlob(response.data, fileName);
    setSuccessMessage('Datei wurde heruntergeladen (direktes Öffnen im Browser nicht für jedes Format möglich).');
  } catch (error) {
    console.error('Fehler beim Öffnen des Dokuments:', error);
    errorMessage.value = error.response?.data?.message || 'Dokument konnte nicht geöffnet werden.';
  }
};

const downloadDocument = async (document) => {
  try {
    clearMessages();
    const response = await documentStore.fetchDocumentBinary(document.document_id);
    saveBlob(response.data, getFileNameFromResponse(response, document.name));
  } catch (error) {
    console.error('Fehler beim Download:', error);
    errorMessage.value = error.response?.data?.message || 'Dokument konnte nicht heruntergeladen werden.';
  }
};
</script>

<style scoped>
.document-view {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.document-header h1 {
  margin: 0 0 6px;
  color: var(--text-main, #1f2937);
  font-size: 2rem;
}

.subtitle {
  margin: 0;
  color: var(--text-muted, #6b7280);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.hidden-input {
  display: none;
}

.card {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.upload-hint {
  margin-bottom: 20px;
  padding: 16px 20px;
  color: var(--text-main, #1f2937);
}

.upload-context {
  margin-bottom: 20px;
  padding: 16px 20px;
}

.task-upload-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 520px;
}

.task-select {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
}

.task-upload-hint {
  margin: 10px 0 0;
  font-size: 0.9rem;
  color: #334155;
}

.task-upload-hint.muted {
  color: var(--text-muted, #64748b);
}

.document-container {
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.document-table {
  width: 100%;
  border-collapse: collapse;
}

.document-table th,
.document-table td {
  padding: 18px 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  vertical-align: top;
}

.document-table th {
  background: var(--bg-soft, #f8fafc);
  color: var(--text-muted, #64748b);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.file-cell,
.uploader-cell,
.grade-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 700;
  color: var(--text-main, #111827);
  word-break: break-word;
}

.file-date,
.feedback-preview,
.text-muted {
  color: var(--text-muted, #6b7280);
  font-size: 0.875rem;
}

.feedback-preview {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge,
.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  width: fit-content;
}

.badge {
  background: #e0e7ff;
  color: #4338ca;
}

.grade-badge.graded {
  background: #dcfce7;
  color: #166534;
}

.grade-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.actions-cell {
  white-space: nowrap;
}

.text-right {
  text-align: right;
}

.btn-primary,
.btn-secondary,
.btn-inline {
  border: none;
  border-radius: 10px;
  padding: 11px 18px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;
}

.btn-primary {
  background: #4f46e5;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled),
.btn-secondary:hover,
.btn-inline:hover,
.btn-icon:hover {
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.btn-secondary,
.btn-inline {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-save {
  background: #dbeafe;
  color: #1d4ed8;
}

.btn-icon {
  background: transparent;
  border: none;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-danger:hover {
  background: #fee2e2;
}

.rename-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rename-input,
.text-input,
.text-area {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
}

.rename-actions,
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.alert {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.alert-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.alert-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.state-panel {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--text-muted, #6b7280);
}

.empty-icon {
  font-size: 3rem;
}

.field-label {
  display: block;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .document-header {
    flex-direction: column;
    align-items: stretch;
  }

  .text-right,
  .actions-cell {
    text-align: left;
  }

  .feedback-preview {
    max-width: 160px;
  }
}
</style>