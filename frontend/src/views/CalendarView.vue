<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useTaskStore } from '@/stores/entities/taskStore';
import { useAuthStore } from '@/stores/authStore';
import { useLessonSlotStore } from '@/stores/entities/lessonSlotStore';
import { formatDateKey, setDateKeepingTime } from '@/composables/useCalendarUtils';
import { useCalendarDragDrop } from '@/composables/useCalendarDragDrop';
import { timeOfDay } from '@/components/calendar/timetable';
import TaskForm from '@/components/tasks/TaskForm.vue';
import CalendarYearView from '@/components/calendar/CalendarYearView.vue';
import CalendarMonthView from '@/components/calendar/CalendarMonthView.vue';
import CalendarWeekView from '@/components/calendar/CalendarWeekView.vue';
import CalendarDayView from '@/components/calendar/CalendarDayView.vue';
import '@/components/calendar/calendar.css';

// The calendar (T60): year, month, week and day views of the open tasks and
// the lessons; tasks move by drag-and-drop. M28: the views, the date math and
// the drag-and-drop live in components/calendar/ and the composables.
// M25 (decision Q19): data through stores, not the api/ layer.
const taskStore = useTaskStore();
const authStore = useAuthStore();
const lessonSlotStore = useLessonSlotStore();

const currentDate = ref(new Date());
const viewMode = ref('month');
const loading = ref(false);
const error = ref(null);
const selectedTask = ref(null);
const isModalOpen = ref(false);

const lessons = ref([]);

const calendarColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#c0392b', '#16a085',
];

const isCompletedTask = (task) => String(task?.status || '').toUpperCase() === 'COMPLETED';
const activeStoreTasks = computed(() => taskStore.tasks.filter((task) => !isCompletedTask(task)));

// the open tasks for the month view, straight from the store, so a
// save or a move shows at once (review M28: a copy made at load went stale)
const events = computed(() =>
  activeStoreTasks.value.map((task, index) => ({
    id: task.task_id ?? task.id,
    date: formatDateKey(task.deadline ? new Date(task.deadline) : new Date()),
    title: task.title,
    color: calendarColors[index % calendarColors.length],
    description: task.description,
    status: task.status,
  })),
);

const loadCalendarData = async () => {
  loading.value = true;
  error.value = null;
  try {
    await taskStore.getTasks();

    const lessonsData = await lessonSlotStore.fetchAll();
    lessons.value = lessonsData
      .map((lesson) => ({
        id: lesson.slot_id,
        dayOfWeek: lesson.day_of_week || 0,
        startTime: timeOfDay(lesson.start_time, '08:00'),
        endTime: timeOfDay(lesson.end_time, '08:50'),
        subject: lesson.subject_id ? `Fach ${lesson.subject_id}` : 'Unterricht',
        room: lesson.room?.name || 'Raum',
        teacher: lesson.teacher?.username || 'Lehrer',
        color: calendarColors[lesson.subject_id % calendarColors.length],
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  } catch (err) {
    console.error('❌ Fehler beim Laden der Kalender-Daten:', err);
    error.value = 'Fehler beim Laden der Daten. Versuchen Sie, die Seite zu aktualisieren.';
  } finally {
    loading.value = false;
  }
};

onMounted(loadCalendarData);

// one step back or forward in the current view
const shift = (direction) => {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'year') {
    currentDate.value = new Date(d.getFullYear() + direction, d.getMonth(), 1);
  } else if (viewMode.value === 'month') {
    currentDate.value = new Date(d.getFullYear(), d.getMonth() + direction, 1);
  } else {
    d.setDate(d.getDate() + direction * (viewMode.value === 'week' ? 7 : 1));
    currentDate.value = d;
  }
};

const openMonth = (monthIndex) => {
  currentDate.value = new Date(currentDate.value.getFullYear(), monthIndex, 1);
  viewMode.value = 'month';
};

const goToToday = () => {
  currentDate.value = new Date();
};

const moveError = (err) => {
  const status = err?.response?.status;
  const backendMsg = err?.response?.data?.message;
  const message = Array.isArray(backendMsg) ? backendMsg.join(' | ') : backendMsg;
  if (status === 403) return 'Task konnte nicht verschoben werden: Keine Berechtigung (edit_tasks).';
  if (status === 404) return 'Task konnte nicht verschoben werden: Task nicht gefunden.';
  if (message) return `Task konnte nicht verschoben werden: ${message}`;
  if (err?.message) return `Task konnte nicht verschoben werden: ${err.message}`;
  return 'Task konnte nicht verschoben werden. Bitte erneut versuchen.';
};

/** A dropped task gets the target day as deadline, at its old time. */
const moveTask = async (id, sourceDateKey, targetDateKey) => {
  try {
    const task = taskStore.tasks.find((t) => String(t.task_id) === String(id) || String(t.id) === String(id));
    const taskId = Number(task?.task_id ?? task?.id ?? id);
    if (Number.isNaN(taskId)) throw new Error('Ungültige Task-ID beim Aktualisieren');

    // Feature #27: a graded submission stays where it is, except for the creator
    if (task?.is_student_submission_locked && task?.created_by !== authStore.userId) {
      throw new Error('Deine Eingabe wurde bewertet - du darfst den Task nicht mehr verschieben bis der Lehrer ein neues Datum setzt');
    }

    const sourceDeadline = task?.deadline
      || events.value.find((event) => String(event.id) === String(id))?.date
      || `${sourceDateKey}T08:00:00`;
    // moveDeadline updates the store's task, so every view follows at once
    await taskStore.moveDeadline(taskId, setDateKeepingTime(sourceDeadline, targetDateKey));
    await taskStore.getTasks();
  } catch (err) {
    console.error('❌ Task konnte nicht verschoben werden:', err);
    error.value = moveError(err);
  }
};

const drag = reactive(useCalendarDragDrop({ onMove: moveTask }));

const openTaskModal = (event) => {
  if (event?.type !== 'task') return;
  const task = taskStore.tasks.find((t) => String(t.task_id ?? t.id) === String(event.id));
  if (task) {
    selectedTask.value = task;
    isModalOpen.value = true;
  }
};

const closeModal = () => {
  selectedTask.value = null;
  isModalOpen.value = false;
};

const handleSave = async (taskData) => {
  try {
    if (taskData.task_id) {
      await taskStore.editTask(taskData.task_id, taskData);
    } else {
      await taskStore.addTask(taskData);
    }
    closeModal();
  } catch (err) {
    console.error('Fehler beim Speichern:', err);
  }
};

const handleSaveWithSubtasks = async ({ taskData, subtasks }) => {
  try {
    await taskStore.editTaskWithSubtasks(taskData.task_id, taskData, subtasks);
    closeModal();
  } catch (err) {
    console.error('Fehler beim Speichern mit Subtasks:', err);
  }
};
</script>

<template>
  <div class="page-container calendar-page">
    <div v-if="error" class="error-banner">
      ⚠️ {{ error }}
      <button @click="loadCalendarData" class="retry-btn">Erneut versuchen</button>
    </div>

    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <p>Kalender wird geladen...</p>
    </div>

    <div class="header-row">
      <h1 class="page-title">Mein Kalender 🗓️</h1>
      <div class="header-controls">
        <div class="view-tabs">
          <label for="view-mode-select" class="view-label">Ansicht</label>
          <select id="view-mode-select" v-model="viewMode" class="view-select">
            <option value="year">🗓️ Jahr</option>
            <option value="month">📅 Monat</option>
            <option value="week">📋 Woche</option>
            <option value="day">📌 Tag</option>
          </select>
        </div>
        <button @click="goToToday" class="btn-today">Heute</button>
      </div>
    </div>

    <div v-if="!loading">
      <CalendarYearView v-if="viewMode === 'year'" :year="currentDate.getFullYear()" :tasks="activeStoreTasks"
        @prev="shift(-1)" @next="shift(1)" @open-month="openMonth" />
      <CalendarMonthView v-if="viewMode === 'month'" :date="currentDate" :events="events" :drag="drag"
        @prev="shift(-1)" @next="shift(1)" @open-task="openTaskModal" />
      <CalendarWeekView v-if="viewMode === 'week'" :date="currentDate" :lessons="lessons" :tasks="activeStoreTasks"
        :drag="drag" @prev="shift(-1)" @next="shift(1)" @open-task="openTaskModal" />
      <CalendarDayView v-if="viewMode === 'day'" :date="currentDate" :lessons="lessons" :tasks="activeStoreTasks" :drag="drag"
        @prev="shift(-1)" @next="shift(1)" @open-task="openTaskModal" />
    </div>
  </div>

  <!-- outside .calendar-page, so the calendar's styles don't reach into the form -->
  <TaskForm
    v-if="isModalOpen && selectedTask"
    class="calendar-task-modal"
    :task="selectedTask"
    @save="handleSave"
    @save-with-subtasks="handleSaveWithSubtasks"
    @close="closeModal"
  />
</template>
