<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchMyGrades } from '@/api/documents';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
const grades = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const selectedGrade = ref(null);
const showDetailModal = ref(false);

const gradesWithFormatting = computed(() => {
  return grades.value.map(grade => ({
    ...grade,
    gradedAtFormatted: new Date(grade.graded_at).toLocaleDateString('de-DE'),
    gradeDisplay: grade.grade || '—',
    hasTask: !!grade.task_title,
  }));
});

const loadGrades = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    const data = await fetchMyGrades();
    grades.value = data;
  } catch (error) {
    console.error('Fehler beim Laden der Bewertungen:', error);
    errorMessage.value = 'Fehler beim Laden der Bewertungen. Bitte versuche es später erneut.';
  } finally {
    isLoading.value = false;
  }
};

const openDetail = (grade) => {
  selectedGrade.value = grade;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedGrade.value = null;
};

onMounted(() => {
  loadGrades();
});
</script>

<template>
  <div class="grades-view">
    <div class="grades-header">
      <h1>📝 Meine Bewertungen & Noten</h1>
      <p class="subtitle">Alle deine bewerteten Aufgaben und Dokumente</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Bewertungen werden geladen...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="error-message">
      ⚠️ {{ errorMessage }}
      <button @click="loadGrades" class="btn-retry">Erneut versuchen</button>
    </div>

    <!-- No Grades -->
    <div v-else-if="grades.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <h2>Noch keine Bewertungen</h2>
      <p>Du hast noch keine bewerteten Aufgaben. Warte auf Feedback von deinen Lehrern!</p>
    </div>

    <!-- Grades List -->
    <div v-else class="grades-container">
      <div 
        v-for="grade in gradesWithFormatting" 
        :key="grade.document_id"
        class="grade-card"
        @click="openDetail(grade)"
      >
        <div class="grade-header">
          <div class="grade-title">
            <h3>{{ grade.name }}</h3>
            <p v-if="grade.task_title" class="task-link">
              📌 {{ grade.task_title }}
            </p>
          </div>
          <div class="grade-badge">
            <span class="grade-value">{{ grade.gradeDisplay }}</span>
          </div>
        </div>

        <div class="grade-meta">
          <span class="date">📅 {{ grade.gradedAtFormatted }}</span>
          <span class="teacher">👨‍🏫 {{ grade.graded_by?.firstname }} {{ grade.graded_by?.lastname }}</span>
        </div>

        <div v-if="grade.feedback" class="feedback-preview">
          <p class="feedback-label">Feedback:</p>
          <p class="feedback-text">
            {{ grade.feedback.substring(0, 100) }}
            <span v-if="grade.feedback.length > 100" class="more">...</span>
          </p>
        </div>

        <div class="card-footer">
          <span class="file-info">📄 {{ grade.mime_type }}</span>
          <span class="action">→ Details anzeigen</span>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <h2>Bewertungsdetails</h2>
          <button @click="closeDetailModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="detail-section">
            <h3>Dokument</h3>
            <p>{{ selectedGrade.name }}</p>
            <small>{{ selectedGrade.mime_type }} • {{ selectedGrade.file_size }} bytes</small>
          </div>

          <div v-if="selectedGrade.task_title" class="detail-section">
            <h3>📌 Aufgabe</h3>
            <p>{{ selectedGrade.task_title }}</p>
          </div>

          <div class="detail-section">
            <h3>Note / Punkte</h3>
            <div class="grade-display">
              <span class="big-grade">{{ selectedGrade.gradeDisplay }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>Bewertet von</h3>
            <p>{{ selectedGrade.graded_by?.firstname }} {{ selectedGrade.graded_by?.lastname }}</p>
            <small>{{ new Date(selectedGrade.graded_at).toLocaleString('de-DE') }}</small>
          </div>

          <div v-if="selectedGrade.feedback" class="detail-section feedback-section">
            <h3>📝 Feedback</h3>
            <div class="feedback-box">
              {{ selectedGrade.feedback }}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDetailModal" class="btn-primary">Schließen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grades-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.grades-header {
  margin-bottom: 2rem;
}

.grades-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  margin-top: 1rem;
  color: #6b7280;
}

/* Error State */
.error-message {
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #991b1b;
  margin-bottom: 1rem;
}

.btn-retry {
  background-color: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn-retry:hover {
  background-color: #b91c1c;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: #374151;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #9ca3af;
}

/* Grades Container */
.grades-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.grade-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.grade-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  border-color: #3b82f6;
}

.grade-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.grade-title h3 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.task-link {
  color: #3b82f6;
  font-size: 0.875rem;
  margin: 0;
}

.grade-badge {
  background: #dbeafe;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}

.grade-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e40af;
}

.grade-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.feedback-preview {
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.feedback-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.feedback-text {
  font-size: 0.9rem;
  color: #4b5563;
  margin: 0;
}

.more {
  color: #9ca3af;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #9ca3af;
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.action {
  color: #3b82f6;
  font-weight: 600;
}

/* Modal Overlay */
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
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.modal-body {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h3 {
  color: #374151;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.detail-section p {
  color: #1f2937;
  margin: 0.25rem 0;
}

.detail-section small {
  color: #9ca3af;
  display: block;
}

.grade-display {
  background: #dbeafe;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.big-grade {
  font-size: 2rem;
  font-weight: bold;
  color: #1e40af;
}

.feedback-section {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  margin-left: -0.5rem;
}

.feedback-box {
  background: #f0f9ff;
  padding: 1rem;
  border-radius: 0.375rem;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:hover {
  background-color: #2563eb;
}

@media (max-width: 768px) {
  .grades-container {
    grid-template-columns: 1fr;
  }

  .grades-header h1 {
    font-size: 1.5rem;
  }
}
</style>
