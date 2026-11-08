<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useClassStore } from '@/stores/entities/schoolStores';

// GOALS.md M36 (decision D2): the class's real students and teachers from the API
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const classStore = useClassStore();
const classId = computed(() => Number(route.params.id));

const activeTab = ref('overview');
const editing = ref(null); // 'students' | 'teachers' while a list is edited
const selection = ref([]);

const classData = computed(() => classStore.current);
const personName = (person) => (person ? `${person.firstname} ${person.lastname}` : '–');
const formatDate = (value) => (value ? String(value).slice(0, 10) : '–');

// Admin and Superuser manage all classes; a teacher of this class changes its members (UC-20)
const canEditMembers = computed(() => {
  if (authStore.isAdmin) return true;
  const me = Number(authStore.userId);
  const cls = classData.value;
  return Boolean(
    cls && (cls.head_teacher?.user_id === me || cls.teachers.some((t) => t.user_id === me))
  );
});

const candidates = computed(() =>
  editing.value === 'students' ? classStore.assignable.students : classStore.assignable.teachers
);

const startEditing = async (list) => {
  try {
    await classStore.loadAssignable();
  } catch {
    return; // without the candidates the editor can't show anyone (review M36)
  }
  selection.value = classData.value[list].map((person) => person.user_id);
  editing.value = list;
};

const saveMembers = async () => {
  try {
    if (editing.value === 'students') await classStore.setStudents(classId.value, selection.value);
    else await classStore.setTeachers(classId.value, selection.value);
    editing.value = null;
  } catch {
    // the store keeps the message (e.g. 403) for the page
  }
};

const otherClassHint = (person) =>
  person.class_id && person.class_id !== classId.value ? ' (wechselt die Klasse)' : '';

onMounted(() => {
  classStore.current = null;
  classStore.open(classId.value).catch(() => {});
});
</script>

<template>
  <div class="class-detail-view">
    <div class="header">
      <button @click="router.back()" class="btn-back">← Zurück</button>
      <h1 v-if="classData">{{ classData.name }}</h1>
      <h1 v-else-if="!classStore.catalog.error">Klasse wird geladen...</h1>
    </div>

    <p v-if="classStore.catalog.error" class="error-message">{{ classStore.catalog.error }}</p>

    <template v-if="classData">
      <div class="tabs">
        <button
          v-for="tab in ['overview', 'students', 'teachers', 'schedule']"
          :key="tab"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab; editing = null"
          class="tab-btn"
        >
          {{ tab === 'overview' ? 'Übersicht' : tab === 'students' ? 'Schüler' : tab === 'teachers' ? 'Lehrer' : 'Stundenplan' }}
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'overview'" class="content-section">
          <div class="info-card">
            <h2>Klasseninformationen</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Klassenname:</label>
                <p>{{ classData.name }}</p>
              </div>
              <div class="info-item">
                <label>Abteilung:</label>
                <p>{{ classData.department?.name || '–' }}</p>
              </div>
              <div class="info-item">
                <label>Klassenvorstand:</label>
                <p>{{ personName(classData.head_teacher) }}</p>
              </div>
              <div class="info-item">
                <label>Anzahl Schüler:</label>
                <p>{{ classData.students.length }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-for="list in ['students', 'teachers']" :key="list">
          <div v-if="activeTab === list" class="content-section">
            <div class="section-header">
              <h2>{{ list === 'students' ? 'Schüler' : 'Unterrichtende Lehrer' }} ({{ classData[list].length }})</h2>
              <button v-if="canEditMembers && editing !== list" @click="startEditing(list)" class="btn-secondary">
                Bearbeiten
              </button>
            </div>

            <div v-if="editing === list" class="list member-editor">
              <label v-for="person in candidates" :key="person.user_id" class="list-item">
                <input type="checkbox" :value="person.user_id" v-model="selection" />
                <span>{{ personName(person) }}<small v-if="list === 'students'">{{ otherClassHint(person) }}</small></span>
              </label>
              <div class="modal-actions">
                <button @click="saveMembers" class="btn-primary">Speichern</button>
                <button @click="editing = null" class="btn-secondary">Abbrechen</button>
              </div>
            </div>
            <div v-else-if="classData[list].length > 0" class="list">
              <div v-for="person in classData[list]" :key="person.user_id" class="list-item">
                <span>{{ personName(person) }}</span>
              </div>
            </div>
            <div v-else class="empty-message">
              {{ list === 'students' ? 'Keine Schüler in dieser Klasse.' : 'Keine Lehrer zugeordnet.' }}
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'schedule'" class="content-section">
          <h2>Stundenplan</h2>
          <div v-if="classData.schedule" class="schedule-info">
            <p><strong>{{ classData.schedule.name }}</strong></p>
            <p>Gültig von {{ formatDate(classData.schedule.valid_from) }} bis {{ formatDate(classData.schedule.valid_to) }}</p>
          </div>
          <div v-else class="empty-message">Kein Stundenplan zugeordnet.</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.error-message {
  color: #b91c1c;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-editor .list-item {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}

.member-editor small {
  color: #6b7280;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

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
