<template>
  <div class="document-view">
    <div class="document-header">
      <h1>Dokumente</h1>
      <div class="header-actions">
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileUpload" 
          class="hidden-input"
          accept=".pdf,.jpg,.jpeg,.png,.docx"
        />
        <button @click="triggerFileInput" class="btn-primary">
          + Dokument hochladen
        </button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="errorMessage" class="alert-error">
        <span class="icon">⚠️</span>
        {{ errorMessage }}
      </div>
    </Transition>

    <div class="document-container card">
      <div v-if="documents.length > 0" class="table-wrapper">
        <table class="document-table">
          <thead>
            <tr>
              <th>Dateiname</th>
              <th>Typ</th>
              <th>Größe</th>
              <th class="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in documents" :key="doc.document_id">
              <td class="font-medium">{{ doc.name }}</td>
              <td><span class="badge">{{ getSimpleType(doc.mime_type) }}</span></td>
              <td class="text-muted">{{ formatBytes(doc.file_size) }}</td>
              <td class="text-right actions-cell">
                <button @click="openDocument(doc)" class="btn-icon" title="Öffnen">👁️</button>
                <button @click="downloadDocument(doc)" class="btn-icon" title="Download">⬇️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-else class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>Keine Dokumente gefunden</h3>
        <p>Lade dein erstes Dokument hoch, um es hier zu verwalten.</p>
      </div>
    </div>

    <p class="upload-hint">
      Maximal 25 MB pro Datei. Erlaubte Formate: PDF, JPG, PNG, DOCX.
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const documents = ref([]); // Hier später deine API-Anbindung
const errorMessage = ref('');
const fileInput = ref(null);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  errorMessage.value = '';

  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = "Datei überschreitet das Limit von 25 MB.";
    event.target.value = '';
    return;
  }

  // Hier folgt dein API-Call
  console.log("Upload startet für:", file.name);
  // Simulierter Erfolg:
  // documents.value.push({ ... });
};

const getSimpleType = (mime) => {
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('image')) return 'Bild';
  if (mime.includes('word')) return 'DOCX';
  return 'Datei';
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const openDocument = (doc) => window.open(doc.file_path, '_blank');
const downloadDocument = (doc) => {
  const link = document.createElement('a');
  link.href = doc.file_path;
  link.download = doc.name;
  link.click();
};
</script>

<style scoped>
/* Struktur & Farben basierend auf deinem Task-Layout */
.document-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border-color, #e5e7eb);
}

.document-header h1 {
  margin: 0;
  color: var(--text-main, #1f2937);
  font-size: 2rem;
}

/* Button Styling analog zu btn-primary */
.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
  background-color: #4338ca;
  transform: translateY(-2px);
}

.hidden-input {
  display: none;
}

/* Card & Table Styling */
.card {
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Darkmode Support über CSS Variablen */
@media (prefers-color-scheme: dark) {
  :root {
    --card-bg: #1f2937;
    --text-main: #f3f4f6;
    --text-muted: #9ca3af;
    --border-color: #374151;
    --bg-hover: #2d3748;
  }
}

.document-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.document-table th {
  padding: 16px;
  background: var(--bg-hover, #f9fafb);
  color: var(--text-muted, #6b7280);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.document-table td {
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  color: var(--text-main, #1f2937);
}

.document-table tr:hover {
  background: var(--bg-hover, #f3f4f6);
}

/* Hilfsklassen */
.text-right { text-align: right; }
.text-muted { color: var(--text-muted, #6b7280); font-size: 0.9rem; }
.font-medium { font-weight: 500; }

.badge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: var(--border-color, #e5e7eb);
}

.upload-hint {
  margin-top: 16px;
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
  text-align: center;
}

.alert-error {
  background: #fef2f2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #fee2e2;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon { font-size: 4rem; margin-bottom: 1rem; }
</style>