<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const classId = computed(() => route.params.id);

// Mock data
const classData = ref({
  class_id: null,
  name: '',
  department_name: '',
  head_teacher_name: '',
  students: [],
  teachers: [],
  schedule: null
});

const activeTab = ref('overview');

const STORAGE_KEY = 'effsync_classes';

onMounted(async () => {
  try {
    // Versuche Daten aus localStorage zu laden
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const classes = JSON.parse(stored);
      const found = classes.find(c => c.class_id === parseInt(classId.value));
      if (found) {
        classData.value = { ...found };
        // Füge Mock-Daten für Students/Teachers hinzu
        classData.value.students = [
          { student_id: 1, firstname: 'Max', lastname: 'Mustermann' },
          { student_id: 2, firstname: 'Anna', lastname: 'Schmidt' },
        ];
        classData.value.teachers = [
          { teacher_id: 1, firstname: 'Dr.', lastname: 'Müller' },
          { teacher_id: 2, firstname: 'Prof.', lastname: 'Weber' },
        ];
        classData.value.schedule = {
          name: 'Stundenplan WS 2025/26',
          valid_from: '2025-09-01',
          valid_to: '2026-06-30'
        };
        return;
      }
    }
    
    // Fallback: Mock-Daten
    classData.value = {
      class_id: classId.value,
      name: '3AKIFT',
      department_name: 'Informationstechnologie',
      head_teacher_name: 'Dr. Müller',
      students: [
        { student_id: 1, firstname: 'Max', lastname: 'Mustermann' },
        { student_id: 2, firstname: 'Anna', lastname: 'Schmidt' },
      ],
      teachers: [
        { teacher_id: 1, firstname: 'Dr.', lastname: 'Müller' },
        { teacher_id: 2, firstname: 'Prof.', lastname: 'Weber' },
      ],
      schedule: {
        name: 'Stundenplan WS 2025/26',
        valid_from: '2025-09-01',
        valid_to: '2026-06-30'
      }
    };
  } catch (error) {
    console.error('Fehler beim Laden der Klassendetails:', error);
  }
});
</script>

<template>
  <div class="class-detail-view">
    <div class="header">
      <button @click="router.back()" class="btn-back">← Zurück</button>
      <h1 v-if="classData.class_id">{{ classData.name }}</h1>
      <h1 v-else>Klasse wird geladen...</h1>
    </div>

    <div class="tabs">
      <button
        v-for="tab in ['overview', 'students', 'teachers', 'schedule']"
        :key="tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
        class="tab-btn"
      >
        {{ tab === 'overview' ? 'Übersicht' : tab === 'students' ? 'Schüler' : tab === 'teachers' ? 'Lehrer' : 'Stundenplan' }}
      </button>
    </div>

    <div class="tab-content">
      <!-- Übersicht Tab -->
      <div v-if="activeTab === 'overview'" class="content-section">
        <div class="info-card">
          <h2>Klassninformationen</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>Klassenname:</label>
              <p>{{ classData.name }}</p>
            </div>
            <div class="info-item">
              <label>Abteilung:</label>
              <p>{{ classData.department_name }}</p>
            </div>
            <div class="info-item">
              <label>Klassenvorstand:</label>
              <p>{{ classData.head_teacher_name }}</p>
            </div>
            <div class="info-item">
              <label>Anzahl Schüler:</label>
              <p>{{ classData.students.length }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Schüler Tab -->
      <div v-if="activeTab === 'students'" class="content-section">
        <h2>Schüler ({{ classData.students.length }})</h2>
        <div v-if="classData.students.length > 0" class="list">
          <div v-for="student in classData.students" :key="student.student_id" class="list-item">
            <span>{{ student.firstname }} {{ student.lastname }}</span>
          </div>
        </div>
        <div v-else class="empty-message">Keine Schüler in dieser Klasse.</div>
      </div>

      <!-- Lehrer Tab -->
      <div v-if="activeTab === 'teachers'" class="content-section">
        <h2>Unterrichtende Lehrer</h2>
        <div v-if="classData.teachers.length > 0" class="list">
          <div v-for="teacher in classData.teachers" :key="teacher.teacher_id" class="list-item">
            <span>{{ teacher.firstname }} {{ teacher.lastname }}</span>
          </div>
        </div>
        <div v-else class="empty-message">Keine Lehrer zugeordnet.</div>
      </div>

      <!-- Stundenplan Tab -->
      <div v-if="activeTab === 'schedule'" class="content-section">
        <h2>Stundenplan</h2>
        <div v-if="classData.schedule" class="schedule-info">
          <p><strong>{{ classData.schedule.name }}</strong></p>
          <p>Gültig von {{ classData.schedule.valid_from }} bis {{ classData.schedule.valid_to }}</p>
        </div>
        <div v-else class="empty-message">Kein Stundenplan zugeordnet.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.class-detail-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-back {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #e5e7eb;
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  color: #1f2937;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  background: none;
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.tab-btn:hover {
  color: #1f2937;
}

.tab-content {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 20px;
}

.content-section h2 {
  margin-top: 0;
  color: #1f2937;
}

.info-card {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.info-item label {
  display: block;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.info-item p {
  margin: 0;
  color: #1f2937;
  font-size: 1rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.empty-message {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 40px 20px;
}

.schedule-info {
  background: #f0f4ff;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #4f46e5;
}

.schedule-info p {
  margin: 8px 0;
  color: #1f2937;
}
</style>
