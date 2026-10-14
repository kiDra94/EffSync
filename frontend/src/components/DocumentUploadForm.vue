<template>
  <div class="upload-form card">
    <div class="upload-header">
      <h3>Dokument hochladen</h3>
      <p class="subtitle">Wähle eine Datei aus (Max. 25MB)</p>
    </div>

    <form @submit.prevent="submitUpload" class="form-body">
      <input 
        type="file" 
        ref="fileInput" 
        @change="handleFileChange" 
        class="hidden-input"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx,.ods,.odp"
      />

      <div 
        class="drop-zone" 
        @click="triggerFileInput"
        :class="{ 'drop-zone-error': errorMessage }"
      >
        <div v-if="!selectedFile" class="drop-zone-prompt">
          <span class="upload-icon">📁</span>
          <p>Klicke hier, um eine Datei auszuwählen</p>
          <span class="file-types">pdf, jpg, jpeg, png, gif, bmp, webp, doc, docx, odt, rtf, txt, md, csv, xls, xlsx, ppt, pptx, ods, odp</span>
        </div>
        
        <div v-else class="selected-file-info">
          <span class="file-icon">{{ getFileIcon(selectedFile.type) }}</span>
          <div class="file-details">
            <p class="file-name">{{ selectedFile.name }}</p>
            <p class="file-size">{{ formatBytes(selectedFile.size) }}</p>
          </div>
          <button @click.stop="clearSelection" class="btn-clear">✕</button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="errorMessage" class="error-msg">
          {{ errorMessage }}
        </div>
      </Transition>

      <div class="form-actions">
        <button type="button" @click="$emit('close')" class="btn-secondary">
          Abbrechen
        </button>
        <button 
          type="submit" 
          class="btn-primary" 
          :disabled="!selectedFile || errorMessage"
        >
          Hochladen
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['close', 'upload']);

const fileInput = ref(null);
const selectedFile = ref(null);
const errorMessage = ref('');

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_TYPES = [
  'application/pdf', 
  'image/jpg',
  'image/jpeg', 
  'image/png', 
  'image/gif',
  'image/bmp',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/rtf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
];

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = [
    'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
    'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'csv',
    'xls', 'xlsx', 'ppt', 'pptx', 'ods', 'odp',
  ];

  if (!ALLOWED_TYPES.includes(file.type) && !allowedExtensions.includes(extension)) {
    errorMessage.value = "Erlaubte Formate: PDF, JPG/JPEG, PNG, GIF, BMP, WEBP, DOC/DOCX, ODT, RTF, TXT, MD, CSV, XLS/XLSX, PPT/PPTX, ODS, ODP.";
    selectedFile.value = null;
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = "Datei ist zu groß. Maximal 25MB erlaubt.";
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
};

const clearSelection = () => {
  selectedFile.value = null;
  errorMessage.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

const submitUpload = async () => { 
  if (selectedFile.value && !errorMessage.value) {
    emit('upload', selectedFile.value); 
  }
};

const getFileIcon = (type) => {
  if (type === 'application/pdf') return '📄';
  if (type.startsWith('image/')) return '🖼️';
  if (type.includes('officedocument')) return '📝';
  return '📁';
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.upload-form {
  background: var(--card-bg, #ffffff);
  padding: 24px;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
}

.upload-header h3 {
  margin: 0;
  color: var(--text-main, #1f2937);
  font-size: 1.25rem;
}

.subtitle {
  color: var(--text-muted, #6b7280);
  font-size: 0.875rem;
  margin: 4px 0 20px 0;
}

.hidden-input {
  display: none;
}

.drop-zone {
  border: 2px dashed var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-hover, #f9fafb);
}

.drop-zone:hover {
  border-color: #4f46e5;
  background: #f5f3ff;
}

.drop-zone-error {
  border-color: #ef4444;
  background: #fef2f2;
}

.upload-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
}

.file-types {
  font-size: 0.75rem;
  color: #9ca3af;
  text-transform: uppercase;
}

.selected-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.file-icon {
  font-size: 2rem;
}

.file-name {
  margin: 0;
  font-weight: 500;
  color: var(--text-main, #1f2937);
  word-break: break-all;
}

.file-size {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
}

.btn-clear {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #9ca3af;
  cursor: pointer;
}

.error-msg {
  background: #fef2f2;
  color: #b91c1c;
  padding: 12px;
  border-radius: 6px;
  margin-top: 16px;
  font-size: 0.875rem;
  border: 1px solid #fee2e2;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Darkmode Support */
@media (prefers-color-scheme: dark) {
  .drop-zone:hover {
    background: #312e81;
  }
}
</style>