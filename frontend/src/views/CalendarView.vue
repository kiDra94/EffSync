<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchTasks } from '@/api/tasks';
import { fetchAllLessonSlots } from '@/api/lessonSlots';
import { useTaskStore } from '@/stores/entities/taskStore';
import TaskForm from '@/components/tasks/TaskForm.vue';

// 1. STATE
const currentDate = ref(new Date());
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const viewMode = ref('month');

// Loading & Error States
const loading = ref(false);
const error = ref(null);
const taskStore = useTaskStore();
const selectedTask = ref(null);
const isModalOpen = ref(false);

// Events (Tasks von API)
const events = ref([]);

// Lessons (Stundenplan von API)
const lessons = ref([]);

// Farb-Palette für Tasks
const taskPalette = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#c0392b', '#16a085'
];

// Funktion zum Laden der Daten von der API
const loadCalendarData = async () => {
    loading.value = true;
    error.value = null;
    try {
        // Lade Tasks
        const tasksData = await fetchTasks();
        events.value = tasksData.map((task, index) => {
            const deadline = task.deadline ? new Date(task.deadline) : new Date();
            const dateStr = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
            return {
                id: task.id,
                date: dateStr,
                title: task.title,
            color: taskPalette[index % taskPalette.length],
                description: task.description,
                status: task.status
            };
        });

        // Lade Lesson Slots
        const lessonsData = await fetchAllLessonSlots();
        lessons.value = lessonsData.map(lesson => {
            const startTime = lesson.start_time ? formatTimeFromISO(lesson.start_time) : '08:00';
            const endTime = lesson.end_time ? formatTimeFromISO(lesson.end_time) : '08:50';
            return {
                id: lesson.id,
                dayOfWeek: lesson.day_of_week || 0,
                startTime,
                endTime,
                subject: lesson.subject_id ? `Fach ${lesson.subject_id}` : 'Unterricht',
                room: lesson.room?.name || 'Raum',
                teacher: lesson.teacher?.username || 'Lehrer',
                color: taskPalette[lesson.subject_id % taskPalette.length]
            };
        }).sort((a, b) => a.startTime.localeCompare(b.startTime));

        console.log('✅ Kalender-Daten geladen:', { tasksCount: events.value.length, lessonsCount: lessons.value.length });
    } catch (err) {
        console.error('❌ Fehler beim Laden der Kalender-Daten:', err);
        error.value = 'Fehler beim Laden der Daten. Versuchen Sie, die Seite zu aktualisieren.';
    } finally {
        loading.value = false;
    }
};

// Helper: Zeit aus ISO-Format konvertieren
function formatTimeFromISO(isoTime) {
    if (!isoTime) return '08:00';
    try {
        // If it's a full ISO datetime, extract just the time
        if (isoTime.includes('T')) {
            return isoTime.split('T')[1].substring(0, 5);
        }
        // If it's just a time string
        return isoTime.substring(0, 5);
    } catch {
        return '08:00';
    }
}

const timeSlots = ref([
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
]);

// 2. LIFECYCLE - Lade Daten beim Component Mount
onMounted(async () => {
  await loadCalendarData();
  if (taskStore.tasks.length === 0) {
    await taskStore.getTasks();
  }
});

// 2. KALENDER LOGIK
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());

const monthName = computed(() => {
    return currentDate.value.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
});

const weekLabel = computed(() => {
    const weekStart = getWeekStart(currentDate.value);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${weekStart.toLocaleDateString('de-DE')} - ${weekEnd.toLocaleDateString('de-DE')}`;
});

// Berechnet alle Tage für das Gitter
const calendarDays = computed(() => {
    const year = currentYear.value;
    const month = currentMonth.value;

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    const days = [];

    for (let i = 0; i < startDayIndex; i++) {
        days.push({ day: '', fullDate: null, isPadding: true });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        const dayTasks = taskStore.tasks
            .filter(task => task.deadline && task.deadline.startsWith(dateStr))
            .map(task => ({id: task.task_id, title: task.title, color: '#4f46e5', type: 'task' }));

        const dayEvents = events.value
            .filter(event => event.date === dateStr)
            .map(event => ({ ...event, type: 'event' }));
        
        days.push({
            day: i,
            fullDate: dateStr,
            isPadding: false,
            isToday: isSameDate(new Date(), year, month, i),
            events: [...dayTasks, ...dayEvents],
        });
    }

    return days;
});

// Wochentage für die aktuelle Woche
const weekDaysWithDates = computed(() => {
    const weekStart = getWeekStart(currentDate.value);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        days.push({
            dayName: weekDays[i],
            date: date,
            dateStr: formatDate(date),
            dayOfWeek: i,
            isToday: isSameDate(new Date(), date.getFullYear(), date.getMonth(), date.getDate())
        });
    }
    return days;
});

// Lessons für einen bestimmten Tag
const getLessonsForDay = (dayOfWeek) => {
    return lessons.value
        .filter(l => l.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

// Tasks für einen bestimmten Tag
const getTasksForDay = (dateStr) => {
    return events.value.filter(e => e.date === dateStr);
};

// Helper Funktionen
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function isSameDate(now, y, m, d) {
    return now.getFullYear() === y && now.getMonth() === m && now.getDate() === d;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Navigation
const prevMonth = () => {
    currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
};

const nextMonth = () => {
    currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
};

const prevWeek = () => {
    const d = new Date(currentDate.value);
    d.setDate(d.getDate() - 7);
    currentDate.value = d;
};

const nextWeek = () => {
    const d = new Date(currentDate.value);
    d.setDate(d.getDate() + 7);
    currentDate.value = d;
};

const goToToday = () => {
    currentDate.value = new Date();
};

// Lesson Position berechnen
const getLessonStyle = (lesson) => {
    const startHour = parseInt(lesson.startTime.split(':')[0]);
    const startMin = parseInt(lesson.startTime.split(':')[1]);
    const endHour = parseInt(lesson.endTime.split(':')[0]);
    const endMin = parseInt(lesson.endTime.split(':')[1]);
    
    const startIdx = timeSlots.value.findIndex(t => t === lesson.startTime);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const heightPerSlot = 30; // px per 30 min
    
    return {
        top: startIdx * heightPerSlot + 'px',
        height: (duration / 30) * heightPerSlot + 'px'
    };
};

const currentDayFormated = computed(() => {
    const date = currentDate.value;
    const dayIndex = (date.getDay() + 6) % 7;

    return {
        dayName: weekDays[dayIndex],
        date: date,
        dateStr: formatDate(date),
        dayOfWeek: dayIndex,
        isToday: isSameDate(new Date(), date.getFullYear(), date.getMonth(), date.getDate())
    };
});

const prevDay = () => {
    const d = new Date(currentDate.value);
    d.setDate(d.getDate() - 1);
    currentDate.value = d;
};

const nextDay= () => {
    const d = new Date(currentDate.value);
    d.setDate(d.getDate() + 1);
    currentDate.value = d;
};

const dayLable = computed(() => {
    const today = currentDate.value;
    return `${today.toLocaleDateString('de-DE')}`;
});

const currentDayEntries = computed(() => {
    const dateStr = currentDayFormated.value.dateStr;

    const dayTasks = taskStore.tasks
        .filter(task => task.deadline && task.deadline.startsWith(dateStr))
        .map(task => ({
            id: task.task_id,
            title: task.title,
            deadline: task.deadline,
            priority_id: task.priority_id,
            status: task.status, 
            type: 'task'
        }));
    console.log(dayTasks);

    const dayEvents = events.value
        .filter(event => event.date === dateStr)
        .map(event => ({ ...event, type: 'event' }));

    return [...dayTasks, ...dayEvents];
});

const openTaskModal = (event) => {
    if(event.type === "task") {
        const task = taskStore.tasks.find(t => t.task_id === event.id);
        if(task) {
            selectedTask.value = task;
            isModalOpen.value = true;
        }
    }
}

const closeModal = () => {
    selectedTask.value = null;
    isModalOpen.value = false;
}

const handleSave = async (taskData) => {
    try {
        if (taskData.task_id) {
            await taskStore.editTask(taskData.task_id, taskData);
        } else {
            await taskStore.addTask(taskData);
        }
        closeModal();
    } catch (error) {
        console.error("Fehler beim Speichern:", error);
    }
};

const handleSaveWithSubtasks = async ({ taskData, subtasks }) => {
    try {
        await taskStore.editTaskWithSubtasks(taskData.task_id, taskData, subtasks);
        closeModal();
    } catch (error) {
        console.error("Fehler beim Speichern mit Subtasks:", error);
    }
};

const taskColors = {
  1: '#34a853', // Grün
  2: '#fbbc04', // Gelb
  3: '#ea4335', // Rot
  4: '#a142f4', // Lila
  COMPLETED: '#9ca3af' // Grau
};

const getTaskStyle = (task, index) => {
    //if (!task.deadline) return { display: 'none' };
    const HEADEROFFSET = 60; // Höhe des Headers
    const HEGIHTOFFSET = 35; // Höhe eines Task-Blocks
    const MAXIMALMINS = 24 * 60; // 1440 Minuten pro Tag
    
    const d = new Date(task.deadline);
    const deadlineMins = d.getHours() * 60 + d.getMinutes();
    const startMins = 0; // 00:00 Uhr
    console.log(deadlineMins);
    let calculatedTop = deadlineMins - startMins - HEADEROFFSET - HEGIHTOFFSET;
    if (calculatedTop < 0) calculatedTop = 0;
    if (calculatedTop > MAXIMALMINS - HEADEROFFSET) calculatedTop = MAXIMALMINS - HEADEROFFSET;

    const bgColor = task.status === 'COMPLETED' ? taskColors.COMPLETED : (taskColors[task.priority_id] || '#4f46e5');

    return {
        top: `${calculatedTop}px`,
        height: '35px',
        left: `${30 + (index * 20)}px`, 
        width: '160px',
        backgroundColor: bgColor,
        position: 'absolute',
        zIndex: 10 + index,
        borderLeft: '3px solid rgba(255,255,255,0.5)',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        pointerEvents: 'auto'
    };
};
</script>

<template>
  <div class="page-container">
    <!-- Error Banner -->
    <div v-if="error" class="error-banner">
      ⚠️ {{ error }}
      <button @click="loadCalendarData" class="retry-btn">Erneut versuchen</button>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <p>Kalender wird geladen...</p>
    </div>

    <div class="header-row">
      <h1 class="page-title">Mein Kalender 🗓️</h1>
      <div class="header-controls">
        <div class="view-tabs">
          <button 
            :class="{ active: viewMode === 'month' }" 
            @click="viewMode = 'month'"
            class="tab-btn"
          >
            📅 Monat
          </button>
          <button 
            :class="{ active: viewMode === 'week' }" 
            @click="viewMode = 'week'"
            class="tab-btn"
          >
            📋 Woche
          </button>
          <button 
            :class="{ active: viewMode === 'day' }" 
            @click="viewMode = 'day'"
            class="tab-btn"
          >
            📋 Tag
          </button>
        </div>
        <button @click="goToToday" class="btn-today">Heute</button>
      </div>
    </div>

    <div v-if="!loading">
    <!-- MONATSANSICHT -->
<div v-if="viewMode === 'month'" class="calendar-card">
  <div class="cal-header">
    <button @click="prevMonth" class="nav-btn">&lt;</button>
    <h2>{{ monthName }}</h2>
    <button @click="nextMonth" class="nav-btn">&gt;</button>
  </div>
 
  <div class="weekdays-row">
    <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
  </div>
 
  <div class="days-grid">
    <div
      v-for="(dayObj, index) in calendarDays"
      :key="index"
      class="day-cell"
      :class="{
        'is-padding': dayObj.isPadding,
        'is-today': dayObj.isToday
      }"
    >
      <span v-if="!dayObj.isPadding" class="day-number">{{ dayObj.day }}</span>
 
      <div class="events-container">
        <div
          v-for="(evt, i) in dayObj.events"
          :key="i"
          class="event-box"
          :class="evt.type === 'task' ? 'event-box--task' : 'event-box--event'"
          @click="openTaskModal(evt)"
          :style="{ backgroundColor: evt.color }"
          :title="evt.title"
        >
          {{ evt.title }}
        </div>
      </div>
    </div>
  </div>
</div>
 

    <!-- WOCHENANSICHT MIT STUNDENPLAN -->
    <div v-if="viewMode === 'week'" class="week-card">
      <div class="week-header">
        <button @click="prevWeek" class="nav-btn">&lt;</button>
        <h2>{{ weekLabel }}</h2>
        <button @click="nextWeek" class="nav-btn">&gt;</button>
      </div>

      <div class="timetable-container">
        <!-- Time Slots (linke Spalte) -->
        <div class="time-column">
          <div class="time-header">Zeit</div>
          <div v-for="time in timeSlots" :key="time" class="time-slot">
            {{ time }}
          </div>
        </div>

        <!-- Wochentage mit Lessons -->
        <div class="days-column">
          <!-- Header mit Wochentagen -->
          <div class="days-header">
            <div 
              v-for="day in weekDaysWithDates" 
              :key="day.dayOfWeek"
              :class="{ 'is-today': day.isToday }"
              class="day-header-cell"
            >
              <div class="day-name">{{ day.dayName }}</div>
              <div class="day-date">{{ day.date.getDate() }}</div>
            </div>
          </div>

          <!-- Tasks oben als Ganztagesevents -->
          <div class="tasks-row">
            <div v-for="day in weekDaysWithDates" :key="'tasks-' + day.dayOfWeek" class="day-tasks">
              <div 
                v-for="(task, idx) in getTasksForDay(day.dateStr)"
                :key="'task-' + idx"
                class="task-card"
                :style="{ backgroundColor: task.color }"
                :title="task.title"
              >
                <span class="task-title">{{ task.title }}</span>
              </div>
            </div>
          </div>

          <!-- Grid mit Lessons -->
          <div class="grid-wrapper">
            <div v-for="day in weekDaysWithDates" :key="day.dayOfWeek" class="day-column-grid">
              <!-- Time Slot Hintergrund -->
              <div v-for="time in timeSlots" :key="time" class="grid-cell"></div>

              <!-- Lessons überlagert -->
              <div class="lessons-layer">
                <div 
                  v-for="(lesson, idx) in getLessonsForDay(day.dayOfWeek)" 
                  :key="idx"
                  class="lesson-card"
                  :style="[getLessonStyle(lesson), { backgroundColor: lesson.color }]"
                  :title="`${lesson.subject} - ${lesson.room}`"
                >
                  <div class="lesson-subject">{{ lesson.subject }}</div>
                  <div class="lesson-time">{{ lesson.startTime }}-{{ lesson.endTime }}</div>
                  <div class="lesson-room">{{ lesson.room }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- TAGESANSICHT MIT STUNDENPLAN -->
    <div v-if="viewMode === 'day'" class="week-card">
      <div class="week-header">
        <button @click="prevDay" class="nav-btn">&lt;</button>
        <h2>{{ dayLable }}</h2>
        <button @click="nextDay" class="nav-btn">&gt;</button>
      </div>

      <div class="timetable-container">
        <!-- Time Slots (linke Spalte) -->
        <div class="time-column">
          <div class="time-header">Zeit</div>
          <div v-for="time in timeSlots" :key="time" class="time-slot">
            {{ time }}
          </div>
        </div>

        <!-- Heute mit Lessons -->
        <div class="days-column">
          <!-- Header mit heute -->
          <div class="days-header days-header--day">
            <div 
              :key="currentDate.dayOfWeek"
              :class="{ 'is-today':  currentDayFormated.isToday}"
              class="day-header-cell"
            >
              <div class="day-name">{{ currentDayFormated.dayName }}</div>
              <div class="day-date">{{ currentDayFormated.date.getDate() }}</div>
            </div>
          </div>

          <!-- Grid mit Lessons -->
          <div class="grid-wrapper grid-wrapper--day">
            <div class="day-column-grid">
              <!-- Time Slot Hintergrund -->
              <div v-for="time in timeSlots" :key="time" class="grid-cell"></div>

              <!-- Lessons überlagert -->
              <div class="lessons-layer">
                <div 
                  v-for="lesson in getLessonsForDay(currentDayFormated.dayOfWeek)" 
                  class="lesson-card"
                  :style="[getLessonStyle(lesson), { backgroundColor: lesson.color }]"
                  :title="`${lesson.subject} - ${lesson.room}`"
                >
                  <div class="lesson-subject">{{ lesson.subject }}</div>
                  <div class="lesson-time">{{ lesson.startTime }}-{{ lesson.endTime }}</div>
                  <div class="lesson-room">{{ lesson.room }}</div>
                </div>
              </div>

              <div class="day-entries">
                <div
                v-for="(evt, i) in currentDayEntries"
                :key="i"
                class="event-box"
                :class="evt.type === 'task' ? 'event-box--task' : 'event-box--event'"
                @click="openTaskModal(evt)"
                :style="getTaskStyle(evt, i)"
                :title="evt.title"
                >
                {{ evt.title }}
                </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
  <div class="modal-content">
    <button class="modal-close-btn" @click="closeModal">✕</button>
    
    <TaskForm 
      v-if="selectedTask" 
      :task="selectedTask" 
      @save="handleSave"
      @save-with-subtasks="handleSaveWithSubtasks"
      @close="closeModal" 
    />
    </div>
</div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* ========== LOADING & ERROR STATES ========== */
.error-banner {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #c00;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.retry-btn {
  background: #c00;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #a00;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-indicator p {
  color: #666;
  font-weight: 500;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  color: #23234c;
  margin: 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-tabs {
  display: flex;
  gap: 8px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
}

.tab-btn {
  background: white;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.tab-btn:hover:not(.active) {
  border-color: #999;
}

.btn-today {
  background: white;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: #555;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-today:hover {
  background: #f0f0f0;
}

/* ========== CALENDAR CARD (MONTH VIEW) ========== */
.calendar-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.cal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.cal-header h2,
.week-header h2 {
  margin: 0;
  color: #23234c;
  text-transform: capitalize;
}

.nav-btn {
  background: #f4f4f9;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  color: #555;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: #e0e0e0;
}

/* Grid System */
.weekdays-row,
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.weekdays-row {
  margin-bottom: 10px;
}

.weekday {
  text-align: center;
  font-weight: bold;
  color: #888;
  font-size: 0.9rem;
}

.day-cell {
  min-height: 90px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 6px;
  position: relative;
  background-color: #fafafa;
  transition: 0.2s;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.day-cell:hover {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-color: #ddd;
}

.day-cell.is-padding {
  background-color: transparent;
  border: none;
  pointer-events: none;
}

.day-cell.is-today {
  border: 2px solid #3498db;
  background-color: #f0f8ff;
}

.day-number {
  font-weight: bold;
  font-size: 0.85rem;
  line-height: 1;
  color: #333;
  margin-bottom: 2px;
}

.day-cell.is-today .day-number {
  color: #3498db;
}

.events-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.event-box {
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 0.7rem;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: opacity 0.15s;
}

.event-box:hover {
  opacity: 0.85;
}

/* ========== WEEK VIEW / TIMETABLE ========== */
.week-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.timetable-container {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  max-height: 800px;
  overflow-y: auto;
}

.time-column {
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  position: sticky;
  left: 0;
  top: 0;
  z-index: 5;
}

.time-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #666;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.85rem;
}

.time-slot {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: #999;
  border-bottom: 1px solid #f0f0f0;
}

.days-column {
  display: flex;
  flex-direction: column;
}

.days-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
  height: 60px;
}

.day-header-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-right: 1px solid #f0f0f0;
}

.day-header-cell.is-today {
  background: #e3f2fd;
}

.day-name {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.day-date {
  font-size: 0.8rem;
  color: #999;
  margin-top: 2px;
}

.day-header-cell.is-today .day-name {
  color: #3498db;
}

.day-header-cell.is-today .day-date {
  color: #3498db;
  font-weight: 600;
}

.tasks-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
  background: #fafafa;
  min-height: 80px;
}

.day-tasks {
  border-right: 1px solid #f0f0f0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-wrap: wrap;
  align-content: flex-start;
}

.day-tasks:last-child {
  border-right: none;
}

.task-card {
  padding: 6px 8px;
  border-radius: 4px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transform: scale(1.02);
}

.task-title {
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
}

.day-entries {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
}

.grid-wrapper {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  position: relative;
}

.day-column-grid {
  position: relative;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
}

.day-column-grid:last-child {
  border-right: none;
}

.grid-cell {
  height: 30px;
  border-bottom: 1px solid #f0f0f0;
  background: white;
}

.grid-cell:nth-child(odd) {
  background: #fafafa;
}

.lessons-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.lesson-card {
  position: absolute;
  left: 4px;
  right: 4px;
  padding: 6px;
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.2s;
}

.lesson-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transform: scale(1.02);
}

.lesson-subject {
  font-weight: 600;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lesson-time {
  font-size: 0.75rem;
  opacity: 0.9;
}

.lesson-room {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 2px;
}

.grid-wrapper--day {
  grid-template-columns: 1fr;
}

.days-header--day {
  grid-template-columns: 1fr;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
}

.modal-close-btn {
  position: absolute;
  top: 30px;
  right: 35px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  z-index: 10;
  font-weight: bold;
}

.modal-close-btn:hover {
  background: #f0f0f0;
}
 
/* ========== DARK MODE ========== */
:global(body.dark-mode) .error-banner {
  background-color: #3a2020 !important;
  border-color: #6b3030 !important;
  color: #ff9999 !important;
}

:global(body.dark-mode) .retry-btn {
  background-color: #c93030 !important;
  border-color: #ff9999 !important;
}

:global(body.dark-mode) .retry-btn:hover {
  background-color: #ff4444 !important;
}

:global(body.dark-mode) .loading-indicator p {
  color: #ccc !important;
}

:global(body.dark-mode) .spinner {
  border-color: #444 !important;
  border-top-color: #4f46e5 !important;
}

:global(body.dark-mode) .page-title,
:global(body.dark-mode) .cal-header h2,
:global(body.dark-mode) .week-header h2 {
  color: white !important;
}

:global(body.dark-mode) .calendar-card,
:global(body.dark-mode) .week-card {
  background-color: #2c2c3e !important;
  border: 1px solid #444;
}

:global(body.dark-mode) .tab-btn {
  background-color: #3b3b54 !important;
  border: 1px solid #555 !important;
  color: #ccc !important;
}

:global(body.dark-mode) .tab-btn.active {
  background-color: #4f46e5 !important;
  border-color: #4f46e5 !important;
  color: white !important;
}

:global(body.dark-mode) .btn-today {
  background-color: #3b3b54 !important;
  border: 1px solid #555 !important;
  color: white !important;
}

:global(body.dark-mode) .btn-today:hover {
  background-color: #4b4b6a !important;
}

:global(body.dark-mode) .nav-btn {
  background-color: #3b3b54 !important;
  color: white !important;
}

:global(body.dark-mode) .nav-btn:hover {
  background-color: #4b4b6a !important;
}

:global(body.dark-mode) .day-cell {
  background-color: #232330 !important;
  border: 1px solid #444 !important;
}

:global(body.dark-mode) .day-cell:hover {
  background-color: #2c2c3e !important;
}

:global(body.dark-mode) .day-number {
  color: #ddd !important;
}

:global(body.dark-mode) .day-cell.is-today {
  border: 2px solid #3498db !important;
  background-color: #233040 !important;
}

/* CHANGED: dark mode for event-box (replaces event-dot) */
:global(body.dark-mode) .event-box {
  opacity: 0.9;
}

:global(body.dark-mode) .time-column {
  background-color: #232330 !important;
}

:global(body.dark-mode) .time-header {
  border-bottom: 1px solid #444 !important;
  color: #999 !important;
}

:global(body.dark-mode) .time-slot {
  color: #666 !important;
  border-bottom: 1px solid #333 !important;
}

:global(body.dark-mode) .timetable-container {
  border: 1px solid #444 !important;
}

:global(body.dark-mode) .days-header {
  background-color: #232330 !important;
  border-bottom: 2px solid #444 !important;
}

:global(body.dark-mode) .day-header-cell {
  border-right: 1px solid #333 !important;
  color: white !important;
}

:global(body.dark-mode) .day-header-cell.is-today {
  background-color: #233040 !important;
}

:global(body.dark-mode) .day-name,
:global(body.dark-mode) .day-date {
  color: #ddd !important;
}

:global(body.dark-mode) .day-header-cell.is-today .day-name,
:global(body.dark-mode) .day-header-cell.is-today .day-date {
  color: #3498db !important;
}

:global(body.dark-mode) .day-header-cell.is-today .day-date {
  color: #3498db !important;
}

:global(body.dark-mode) .tasks-row {
  background-color: #232330 !important;
  border-bottom: 2px solid #444 !important;
}

:global(body.dark-mode) .day-tasks {
  border-right: 1px solid #333 !important;
}

:global(body.dark-mode) .task-card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
}

:global(body.dark-mode) .task-card:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
}

:global(body.dark-mode) .grid-cell {
  background-color: #2c2c3e !important;
  border-bottom: 1px solid #333 !important;
}

:global(body.dark-mode) .grid-cell:nth-child(odd) {
  background-color: #232330 !important;
}

:global(body.dark-mode) .day-column-grid {
  border-right: 1px solid #333 !important;
}

:global(body.dark-mode) .lesson-card {
  box-shadow: 0 2px 4px rgba(0,0,0,0.4) !important;
}

:global(body.dark-mode) .lesson-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.6) !important;
}
</style>
