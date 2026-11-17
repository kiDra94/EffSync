<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import ScheduleForm from '@/components/schedules/ScheduleForm.vue';
import ScheduleDeleteDialog from '@/components/schedules/ScheduleDeleteDialog.vue';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/entities/schoolStores';

// GOALS.md M36 (decision D1): schedules from the API, nothing in the browser
const scheduleStore = useScheduleStore();
const formatDate = (value) => (value ? String(value).slice(0, 10) : '');
// the list shape the view shows: the counts come from the API's classes and lesson slots
const schedules = computed(() =>
  scheduleStore.items.map((schedule) => ({
    ...schedule,
    valid_from: formatDate(schedule.valid_from),
    valid_to: formatDate(schedule.valid_to),
    class_count: schedule.classes?.length ?? 0,
    lesson_count: schedule.lesson_slots?.length ?? 0,
  }))
);

const selectedSchedule = ref(null);
const activeModal = ref(null);
// the view has a list and a detail; 'week' rendered nothing (M36)
const activeView = ref('list');
const searchQuery = ref('');
const authStore = useAuthStore();
const route = useRoute();

const canManageSchedules = computed(() => {
  const role = (authStore.userRole || '').toLowerCase();
  return ['admin', 'superuser', 'director'].includes(role);
});

const filteredSchedules = computed(() => {
  if (!searchQuery.value) return schedules.value;
  return schedules.value.filter(s =>
    s.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const openScheduleForm = (schedule = null) => {
  if (!canManageSchedules.value) return;
  selectedSchedule.value = schedule ? JSON.parse(JSON.stringify(schedule)) : null;
  activeModal.value = 'form';
};

const openScheduleDetail = (schedule) => {
  selectedSchedule.value = schedule;
  activeView.value = 'detail';
};

const openDeleteDialog = (schedule) => {
  if (!canManageSchedules.value) return;
  selectedSchedule.value = schedule;
  activeModal.value = 'delete';
};

const closeModal = () => {
  activeModal.value = null;
  selectedSchedule.value = null;
};

const saveSchedule = async ({ schedule_id, name, valid_from, valid_to }) => {
  if (!canManageSchedules.value) return;
  const data = { name, valid_from: valid_from || undefined, valid_to: valid_to || undefined };
  try {
    if (schedule_id) await scheduleStore.edit(schedule_id, data);
    else await scheduleStore.add(data);
    closeModal();
    activeView.value = 'list';
  } catch {
    // the store keeps the message for the page
  }
};

const deleteSchedule = async () => {
  if (!canManageSchedules.value || !selectedSchedule.value) return;
  try {
    await scheduleStore.remove(selectedSchedule.value.schedule_id);
    activeView.value = 'list';
  } catch {
    // e.g. 400: the schedule still has lessons
  }
  closeModal();
};

const isActive = (schedule) => {
  const today = new Date();
  const from = new Date(schedule.valid_from);
  const to = new Date(schedule.valid_to);
  return from <= today && today <= to;
};

const goBackToList = () => {
  activeView.value = 'list';
  selectedSchedule.value = null;
};

onMounted(async () => {
  await scheduleStore.load().catch(() => {});
  // Auto-open today's active schedule if navigated with ?today=true
  if (route.query.today === 'true') {
    const active = schedules.value.find(s => isActive(s));
    if (active) openScheduleDetail(active);
  }
});
</script>

<template>
  <div class="schedules-view">
    <!-- List View -->
    <div v-if="activeView === 'list'">
      <div class="schedules-header">
        <h1>Stundenpläne</h1>
        <button v-if="canManageSchedules" @click="openScheduleForm()" class="btn-primary">
          + Neuer Stundenplan
        </button>
      </div>

      <p v-if="scheduleStore.error" class="error-message">{{ scheduleStore.error }}</p>

      <div class="controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Stundenplan durchsuchen..."
          class="search-input"
        />
      </div>

      <div v-if="filteredSchedules.length > 0" class="schedules-list">
        <div v-for="schedule in filteredSchedules" :key="schedule.schedule_id" class="schedule-card">
          <div class="schedule-card-header">
            <div class="schedule-title">
              <h3>{{ schedule.name }}</h3>
              <span v-if="isActive(schedule)" class="active-badge">Aktiv</span>
            </div>
            <div class="schedule-actions">
              <button @click="openScheduleDetail(schedule)" class="btn-icon" title="Details anzeigen">👁️</button>
              <button v-if="canManageSchedules" @click="openScheduleForm(schedule)" class="btn-icon" title="Bearbeiten">✏️</button>
              <button v-if="canManageSchedules" @click="openDeleteDialog(schedule)" class="btn-icon btn-danger" title="Löschen">🗑️</button>
            </div>
          </div>

          <div class="schedule-card-body">
            <div class="schedule-info-grid">
              <div class="info-item">
                <span class="info-label">Gültig von:</span>
                <span class="info-value">{{ schedule.valid_from }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Gültig bis:</span>
                <span class="info-value">{{ schedule.valid_to }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Klassen:</span>
                <span class="info-value">{{ schedule.class_count }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Unterrichtsstunden:</span>
                <span class="info-value">{{ schedule.lesson_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>Keine Stundenpläne vorhanden.</p>
        <button v-if="canManageSchedules" @click="openScheduleForm()" class="btn-primary">Ersten Stundenplan erstellen</button>
        <p v-else>Du hast nur Leserechte für Stundenpläne.</p>
      </div>
    </div>

    <!-- Detail View -->
    <div v-if="activeView === 'detail' && selectedSchedule" class="schedule-detail">
      <button @click="goBackToList" class="btn-back">← Zurück zur Liste</button>

      <div class="detail-header">
        <h1>{{ selectedSchedule.name }}</h1>
        <div v-if="canManageSchedules" class="detail-actions">
          <button @click="openScheduleForm(selectedSchedule)" class="btn-secondary">Bearbeiten</button>
          <button @click="openDeleteDialog(selectedSchedule)" class="btn-danger">Löschen</button>
        </div>
      </div>

      <div class="detail-content">
        <div class="info-card">
          <h2>Informationen</h2>
          <div class="info-grid-2">
            <div class="info-row">
              <label>Name:</label>
              <p>{{ selectedSchedule.name }}</p>
            </div>
            <div class="info-row">
              <label>Gültig von:</label>
              <p>{{ selectedSchedule.valid_from }}</p>
            </div>
            <div class="info-row">
              <label>Gültig bis:</label>
              <p>{{ selectedSchedule.valid_to }}</p>
            </div>
            <div class="info-row">
              <label>Anzahl der Klassen:</label>
              <p>{{ selectedSchedule.class_count }}</p>
            </div>
            <div class="info-row">
              <label>Unterrichtsstunden:</label>
              <p>{{ selectedSchedule.lesson_count }}</p>
            </div>
            <div class="info-row">
              <label>Status:</label>
              <p>
                <span v-if="isActive(selectedSchedule)" class="status-active">🟢 Aktiv</span>
                <span v-else class="status-inactive">⚪ Inaktiv</span>
              </p>
            </div>
          </div>
        </div>

        <div class="content-card">
          <h2>Stundenplan-Inhalte</h2>
          <p class="content-message">Die Stundenplan-Inhalte (Stundenkonfigurationen) können nach Implementierung der erweiterten Features bearbeitet werden.</p>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ScheduleForm v-if="activeModal === 'form'" :schedule="selectedSchedule" @save="saveSchedule" @close="closeModal" />
    <ScheduleDeleteDialog v-if="activeModal === 'delete'" :schedule="selectedSchedule" @delete="deleteSchedule" @close="closeModal" />
  </div>
</template>

<style scoped>
.error-message {
  color: #b91c1c;
  margin-bottom: 12px;
}

.schedules-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.schedules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.schedules-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 2rem;
}

.controls {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 350px;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
}

.schedules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.schedule-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.schedule-card-header {
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schedule-title h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.active-badge {
  background: #10b981;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.schedule-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.btn-icon.btn-danger:hover {
  background: rgba(229, 62, 62, 0.1);
}

.schedule-card-body {
  padding: 12px 16px;
}

.schedule-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.info-value {
  color: #1f2937;
  font-size: 1rem;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

/* Detail View Styles */
.schedule-detail {
  padding: 20px 0;
}

.btn-back {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 20px;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #e5e7eb;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.detail-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 2rem;
}

.detail-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}

.detail-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.info-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.content-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.info-card h2,
.content-card h2 {
  margin-top: 0;
  color: #1f2937;
  font-size: 1.2rem;
}

.info-grid-2 {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.85rem;
}

.info-row p {
  margin: 0;
  color: #1f2937;
  font-size: 1rem;
}

.status-active {
  color: #10b981;
  font-weight: 600;
}

.status-inactive {
  color: #6b7280;
  font-weight: 600;
}

.content-message {
  color: #999;
  font-style: italic;
}

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
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}
</style>

<style>
body.dark-mode .schedules-view,
.app-container.dark-mode .schedules-view {
  color: #edf0fa;
}

body.dark-mode .page-header h1,
.app-container.dark-mode .page-header h1 {
  color: #edf0fa !important;
}

body.dark-mode .search-input,
.app-container.dark-mode .search-input {
  background: #31364d !important;
  border-color: #434963 !important;
  color: #edf0fa !important;
}

body.dark-mode .schedule-card,
.app-container.dark-mode .schedule-card {
  background: #25283a !important;
  border-color: #434963 !important;
}

body.dark-mode .schedule-card-header,
.app-container.dark-mode .schedule-card-header {
  background: #2a2f45 !important;
  border-color: #434963 !important;
}

body.dark-mode .schedule-title h3,
.app-container.dark-mode .schedule-title h3 {
  color: #edf0fa !important;
}

body.dark-mode .info-label,
.app-container.dark-mode .info-label {
  color: #b2b9cb !important;
}

body.dark-mode .info-value,
.app-container.dark-mode .info-value,
body.dark-mode .info-row p,
.app-container.dark-mode .info-row p {
  color: #edf0fa !important;
}

body.dark-mode .info-card,
body.dark-mode .content-card,
.app-container.dark-mode .info-card,
.app-container.dark-mode .content-card {
  background: #25283a !important;
  border-color: #434963 !important;
}

body.dark-mode .info-card h2,
body.dark-mode .content-card h2,
body.dark-mode .detail-header h1,
.app-container.dark-mode .info-card h2,
.app-container.dark-mode .content-card h2,
.app-container.dark-mode .detail-header h1 {
  color: #edf0fa !important;
}

body.dark-mode .info-row label,
.app-container.dark-mode .info-row label {
  color: #b2b9cb !important;
}

body.dark-mode .detail-header,
.app-container.dark-mode .detail-header {
  border-color: #434963 !important;
}

body.dark-mode .btn-back,
body.dark-mode .btn-secondary,
.app-container.dark-mode .btn-back,
.app-container.dark-mode .btn-secondary {
  background: #31364d !important;
  border-color: #434963 !important;
  color: #edf0fa !important;
}

body.dark-mode .btn-icon,
.app-container.dark-mode .btn-icon {
  color: #b2b9cb !important;
}

body.dark-mode .btn-icon:hover,
.app-container.dark-mode .btn-icon:hover {
  background: rgba(255,255,255,0.08) !important;
}

body.dark-mode .empty-state,
.app-container.dark-mode .empty-state,
body.dark-mode .content-message,
.app-container.dark-mode .content-message {
  color: #7a8199 !important;
}
</style>
