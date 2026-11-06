<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { fetchTasks, patchTask } from '@/api/tasks';
import { fetchAllLessonSlots } from '@/api/lessonSlots';
import { useTaskStore } from '@/stores/entities/taskStore';
import { useAuthStore } from '@/stores/authStore';
import TaskForm from '@/components/tasks/TaskForm.vue';

// 1. STATE
const currentDate = ref(new Date());
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const viewMode = ref('month');

// Loading & Error States
const loading = ref(false);
const error = ref(null);
const taskStore = useTaskStore();
const authStore = useAuthStore();
const selectedTask = ref(null);
const isModalOpen = ref(false);
const weekTimetableRef = ref(null);
const dayTimetableRef = ref(null);
const draggedTask = ref(null);
const dragOverDate = ref(null);
const dragOverRelativeTarget = ref(null);
const DEFAULT_WEEK_SCROLL_TIME = '07:30';
const TIME_SLOT_HEIGHT_PX = 30;
const TIME_HEADER_HEIGHT_PX = 60;

onMounted(async () => {
    if (taskStore.tasks.length === 0) {
        await taskStore.getTasks();
  }
});

// Events (Tasks von API)
const events = ref([]);

// Lessons (Stundenplan von API)
const lessons = ref([]);

// Farb-Palette für Tasks
const calendarColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#c0392b', '#16a085'
];

  const isCompletedTask = (task) => String(task?.status || '').toUpperCase() === 'COMPLETED';

  const activeStoreTasks = computed(() => taskStore.tasks.filter((task) => !isCompletedTask(task)));

// Funktion zum Laden der Daten von der API
const loadCalendarData = async () => {
    loading.value = true;
    error.value = null;
    try {
        // Lade Tasks
        const tasksData = await fetchTasks();
        events.value = tasksData
          .filter((task) => !isCompletedTask(task))
          .map((task, index) => {
            const deadline = task.deadline ? new Date(task.deadline) : new Date();
            const dateStr = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
            return {
            id: task.task_id ?? task.id,
                date: dateStr,
                title: task.title,
                color: calendarColors[index % calendarColors.length],
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
                id: lesson.slot_id,
                dayOfWeek: lesson.day_of_week || 0,
                startTime,
                endTime,
                subject: lesson.subject_id ? `Fach ${lesson.subject_id}` : 'Unterricht',
                room: lesson.room?.name || 'Raum',
                teacher: lesson.teacher?.username || 'Lehrer',
                color: calendarColors[lesson.subject_id % calendarColors.length]
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

  const scrollWeekToDefaultTime = async () => {
    await nextTick();
    if (!weekTimetableRef.value) return;

    const slotIndex = timeSlots.value.findIndex((slot) => slot === DEFAULT_WEEK_SCROLL_TIME);
    if (slotIndex < 0) return;

    const targetScrollTop = Math.max(0, (slotIndex * TIME_SLOT_HEIGHT_PX) + TIME_HEADER_HEIGHT_PX - 8);
    weekTimetableRef.value.scrollTop = targetScrollTop;
  };

const scrollDayToDefaultTime = async () => {
  await nextTick();
  if (!dayTimetableRef.value) return;

  const slotIndex = timeSlots.value.findIndex((slot) => slot === DEFAULT_WEEK_SCROLL_TIME);
  if (slotIndex < 0) return;

  const targetScrollTop = Math.max(0, (slotIndex * TIME_SLOT_HEIGHT_PX) + TIME_HEADER_HEIGHT_PX - 8);
  dayTimetableRef.value.scrollTop = targetScrollTop;
};

// 2. LIFECYCLE - Lade Daten beim Component Mount
onMounted(() => {
    loadCalendarData();
});

watch(viewMode, async (mode) => {
  if (mode === 'week') {
    await scrollWeekToDefaultTime();
  } else if (mode === 'day') {
    await scrollDayToDefaultTime();
  }
});

// 2. KALENDER LOGIK
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());

const monthName = computed(() => {
    return currentDate.value.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
});

const yearLabel = computed(() => String(currentYear.value));
const miniWeekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const yearMonths = computed(() => {
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const firstDay = new Date(currentYear.value, monthIndex, 1);
    const daysInMonth = new Date(currentYear.value, monthIndex + 1, 0).getDate();
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    const miniDays = [];
    for (let i = 0; i < startDayIndex; i++) {
      miniDays.push({
        key: `pad-${monthIndex}-${i}`,
        isPadding: true,
        day: '',
        taskCount: 0,
        hasTasks: false,
        isToday: false
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear.value}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekdayIndex = (startDayIndex + day - 1) % 7;
      miniDays.push({
        key: dateStr,
        dateStr,
        isPadding: false,
        day,
        weekdayIndex,
        isWeekend: weekdayIndex >= 5,
        taskCount: 0,
        hasTasks: false,
        isToday: false
      });
    }

    return {
      monthIndex,
      label: firstDay.toLocaleString('de-DE', { month: 'long' }),
      count: 0,
      overflowCount: 0,
      isCurrentMonth: false,
      miniDays
    };
  });

  const sourceTasks = activeStoreTasks.value.length > 0
    ? activeStoreTasks.value
    : events.value.map(event => ({
      task_id: event.id,
      deadline: event.date,
      title: event.title
    }));

  sourceTasks.forEach((task) => {
    if (!task?.deadline) return;
    const d = new Date(task.deadline);
    if (Number.isNaN(d.getTime())) return;
    if (d.getFullYear() !== currentYear.value) return;

    const monthIdx = d.getMonth();
    const dateStr = `${d.getFullYear()}-${String(monthIdx + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    months[monthIdx].count += 1;

    const targetDay = months[monthIdx].miniDays.find((cell) => cell.dateStr === dateStr);
    if (targetDay) {
      targetDay.taskCount += 1;
      targetDay.hasTasks = true;
    }
  });

  const now = new Date();
  return months.map((month) => ({
    ...month,
    overflowCount: month.count > 5 ? month.count : 0,
    isCurrentMonth: now.getFullYear() === currentYear.value && now.getMonth() === month.monthIndex,
    miniDays: month.miniDays.map((cell) => ({
      ...cell,
      isToday:
        !cell.isPadding &&
        now.getFullYear() === currentYear.value &&
        now.getMonth() === month.monthIndex &&
        now.getDate() === cell.day
    }))
  }));
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

        const dayEvents = events.value
            .filter(event => event.date === dateStr)
            .map(event => ({ ...event, type: 'task' }));
        
        days.push({
            day: i,
            fullDate: dateStr,
            isPadding: false,
            isToday: isSameDate(new Date(), year, month, i),
            events: dayEvents,
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
  return activeStoreTasks.value
    .filter(task => task.deadline && String(task.deadline).startsWith(dateStr))
    .map(task => ({
      id: task.task_id ?? task.id,
      date: dateStr,
      title: task.title,
      color: priorityColors[task.priority_id] || '#4f46e5',
      description: task.description,
      status: task.status,
      type: 'task'
    }));
};

const onTaskDragStart = (taskLike, sourceDateStr, dragEvent = null) => {
  if (!taskLike) return;
  const taskId = taskLike.id ?? taskLike.task_id;
  const taskType = taskLike.type ?? 'task';
  if (!taskId || taskType !== 'task') return;

  draggedTask.value = {
    id: taskId,
    sourceDateStr,
  };

  if (dragEvent?.dataTransfer) {
    dragEvent.dataTransfer.effectAllowed = 'move';
    dragEvent.dataTransfer.setData('text/plain', String(taskId));
  }
};

const onTaskDragEnd = () => {
  draggedTask.value = null;
  dragOverDate.value = null;
  dragOverRelativeTarget.value = null;
};

const onDragOverDate = (targetDateStr) => {
  if (!draggedTask.value || !targetDateStr) return;
  dragOverDate.value = targetDateStr;
};

const onDragLeaveDate = (targetDateStr) => {
  if (dragOverDate.value === targetDateStr) {
    dragOverDate.value = null;
  }
};

const onDropOnDate = async (targetDateStr) => {
  if (!draggedTask.value || !targetDateStr) return;

  const { id, sourceDateStr } = draggedTask.value;
  if (sourceDateStr === targetDateStr) {
    onTaskDragEnd();
    return;
  }

  try {
    const matchedTask = taskStore.tasks.find(
      (task) => String(task.task_id) === String(id) || String(task.id) === String(id)
    );

    const taskIdForUpdate = matchedTask?.task_id ?? matchedTask?.id ?? id;
    if (taskIdForUpdate === undefined || taskIdForUpdate === null || taskIdForUpdate === '') {
      throw new Error('Ungültige Task-ID beim Verschieben');
    }

    // Nur blockieren wenn Task gesperrt ist UND der Benutzer nicht der Creator ist
    // Feature #27: Prüfe STUDENT_SUBMISSION_LOCKED statt globalem is_locked
    const isCreator = matchedTask?.created_by === authStore.userId;
    const isStudentSubmissionLocked = matchedTask?.is_student_submission_locked;
    
    if (isStudentSubmissionLocked && !isCreator) {
      throw new Error('Deine Eingabe wurde bewertet - du darfst den Task nicht mehr verschieben bis der Lehrer ein neues Datum setzt');
    }

    const sourceDeadline = matchedTask?.deadline
      || events.value.find((event) => String(event.id) === String(id))?.date
      || `${sourceDateStr}T08:00:00`;

    const sourceDate = new Date(sourceDeadline);
    const hours = Number.isNaN(sourceDate.getTime()) ? 8 : sourceDate.getHours();
    const minutes = Number.isNaN(sourceDate.getTime()) ? 0 : sourceDate.getMinutes();
    const seconds = Number.isNaN(sourceDate.getTime()) ? 0 : sourceDate.getSeconds();

    const [year, month, day] = targetDateStr.split('-').map(Number);
    const nextDeadlineDate = new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds);
    const nextDeadlineIso = nextDeadlineDate.toISOString();

    const numericTaskId = Number(taskIdForUpdate);
    if (Number.isNaN(numericTaskId)) {
      throw new Error('Ungültige Task-ID beim Aktualisieren');
    }

    await patchTask(numericTaskId, { deadline: nextDeadlineIso });

    events.value = events.value.map((event) =>
      String(event.id) === String(id)
        ? { ...event, date: targetDateStr }
        : event
    );

    await taskStore.getTasks();
  } catch (err) {
    console.error('❌ Task konnte nicht verschoben werden:', err);
    const status = err?.response?.status;
    const backendMsg = err?.response?.data?.message;
    const normalizedBackendMsg = Array.isArray(backendMsg)
      ? backendMsg.join(' | ')
      : backendMsg;

    if (status === 403) {
      error.value = 'Task konnte nicht verschoben werden: Keine Berechtigung (edit_tasks).';
    } else if (status === 404) {
      error.value = 'Task konnte nicht verschoben werden: Task nicht gefunden.';
    } else if (normalizedBackendMsg) {
      error.value = `Task konnte nicht verschoben werden: ${normalizedBackendMsg}`;
    } else if (err?.message) {
      error.value = `Task konnte nicht verschoben werden: ${err.message}`;
    } else {
      error.value = 'Task konnte nicht verschoben werden. Bitte erneut versuchen.';
    }
  } finally {
    onTaskDragEnd();
  }
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

const prevYear = () => {
  currentDate.value = new Date(currentYear.value - 1, currentMonth.value, 1);
};

const nextYear = () => {
  currentDate.value = new Date(currentYear.value + 1, currentMonth.value, 1);
};

const openMonthFromYear = (monthIndex) => {
  currentDate.value = new Date(currentYear.value, monthIndex, 1);
  viewMode.value = 'month';
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

    const dayEvents = events.value
        .filter(event => event.date === dateStr)
        .map(event => ({ ...event, type: 'task' }));

    return dayEvents;
});

const openTaskModal = (event) => {
  if (event?.type !== 'task') return;

  const eventId = event.id ?? event.task_id;
  const task = taskStore.tasks.find(
    (t) => String(t.task_id ?? t.id) === String(eventId)
  ) ?? events.value.find((e) => String(e.id) === String(eventId));

  if (task) {
    selectedTask.value = task;
    isModalOpen.value = true;
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

  const shiftDateStrByDays = (dateStr, days) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    const base = new Date(year, (month || 1) - 1, day || 1);
    base.setDate(base.getDate() + days);
    return formatDate(base);
  };

  const onDragOverRelativeDay = (offsetDays) => {
    if (!draggedTask.value) return;
    dragOverRelativeTarget.value = offsetDays;
  };

  const onDragLeaveRelativeDay = (offsetDays) => {
    if (dragOverRelativeTarget.value === offsetDays) {
      dragOverRelativeTarget.value = null;
    }
  };

  const onDropOnRelativeDay = async (offsetDays) => {
    if (!draggedTask.value) return;
    const baseDateStr = draggedTask.value.sourceDateStr || currentDayFormated.value.dateStr;
    const targetDateStr = shiftDateStrByDays(baseDateStr, offsetDays);
    if (!targetDateStr) {
      onTaskDragEnd();
      return;
    }
    dragOverRelativeTarget.value = null;
    await onDropOnDate(targetDateStr);
  };

const handleSaveWithSubtasks = async ({ taskData, subtasks }) => {
    try {
        await taskStore.editTaskWithSubtasks(taskData.task_id, taskData, subtasks);
        closeModal();
    } catch (error) {
        console.error("Fehler beim Speichern mit Subtasks:", error);
    }
};

const priorityColors = {
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
    const startMins = 0;
    let calculatedTop = deadlineMins - startMins - HEADEROFFSET - HEGIHTOFFSET;
    if (calculatedTop < 0) calculatedTop = 0;
    if (calculatedTop > MAXIMALMINS - HEADEROFFSET) calculatedTop = MAXIMALMINS - HEADEROFFSET;

    const bgColor = task.status === 'COMPLETED' ? priorityColors.COMPLETED : (priorityColors[task.priority_id] || '#4f46e5');

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
        'is-today': dayObj.isToday,
        'drag-over': !dayObj.isPadding && dragOverDate === dayObj.fullDate
      }"
      @dragover.prevent="onDragOverDate(dayObj.fullDate)"
      @dragleave="onDragLeaveDate(dayObj.fullDate)"
      @drop.prevent="onDropOnDate(dayObj.fullDate)"
    >
      <span v-if="!dayObj.isPadding" class="day-number">{{ dayObj.day }}</span>
 
      <div class="events-container">
        <div
          v-for="(evt, i) in dayObj.events"
          :key="i"
          class="event-box"
          :class="evt.type === 'task' ? 'event-box--task' : 'event-box--event'"
          :draggable="evt.type === 'task'"
          @dragstart="onTaskDragStart(evt, dayObj.fullDate, $event)"
          @dragend="onTaskDragEnd"
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

    <!-- JAHRESANSICHT -->
    <div v-if="viewMode === 'year'" class="calendar-card">
      <div class="cal-header">
        <button @click="prevYear" class="nav-btn">&lt;</button>
        <h2>{{ yearLabel }}</h2>
        <button @click="nextYear" class="nav-btn">&gt;</button>
      </div>

      <div class="year-grid">
        <button
          v-for="month in yearMonths"
          :key="month.monthIndex"
          class="year-month-card"
          :class="{ 'is-current': month.isCurrentMonth }"
          @click="openMonthFromYear(month.monthIndex)"
          :title="`${month.label}: ${month.count} Tasks`"
        >
          <div class="year-month-header">
            <span class="year-month-name">{{ month.label }}</span>
          </div>

          <div class="mini-weekdays">
            <span
              v-for="(weekday, weekdayIndex) in miniWeekDays"
              :key="`${month.monthIndex}-${weekday}-${weekdayIndex}`"
              class="mini-weekday"
              :class="{ 'is-weekend': weekdayIndex >= 5 }"
            >
              {{ weekday }}
            </span>
          </div>

          <div class="mini-days-grid" aria-label="Monatskalender">
            <div
              v-for="cell in month.miniDays"
              :key="cell.key"
              class="mini-day-cell"
              :class="{
                'is-padding': cell.isPadding,
                'has-task': cell.hasTasks,
                'is-today': cell.isToday,
                'is-weekend': cell.isWeekend
              }"
            >
              <span
                v-if="!cell.isPadding"
                class="mini-day-number"
                :class="{ 'is-weekend': cell.isWeekend }"
              >
                {{ cell.day }}
              </span>
              <span v-if="cell.hasTasks" class="mini-day-dot"></span>
            </div>
          </div>

          <div class="year-month-footer">
            <span v-if="month.overflowCount > 5" class="year-task-overflow">
              {{ month.overflowCount }} Tasks
            </span>
          </div>
        </button>
      </div>
    </div>
 

    <!-- WOCHENANSICHT MIT STUNDENPLAN -->
    <div v-if="viewMode === 'week'" class="week-card">
      <div class="week-header">
        <button @click="prevWeek" class="nav-btn">&lt;</button>
        <h2>{{ weekLabel }}</h2>
        <button @click="nextWeek" class="nav-btn">&gt;</button>
      </div>

      <div ref="weekTimetableRef" class="timetable-container">
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

          <!-- Grid mit Lessons -->
          <div class="grid-wrapper">
            <div v-for="day in weekDaysWithDates" :key="day.dayOfWeek" class="day-column-grid">
              <!-- Time Slot Hintergrund -->
              <div v-for="time in timeSlots" :key="time" class="grid-cell"></div>

              <!-- Lessons überlagert -->
              <div class="lessons-layer">
                <div 
                  v-for="lesson in getLessonsForDay(day.dayOfWeek)" 
                  :key="lesson.id"
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

          <!-- Tasks unterhalb des Stundenplans -->
          <div class="tasks-row">
            <div
              v-for="day in weekDaysWithDates"
              :key="'tasks-' + day.dayOfWeek"
              class="day-tasks"
              :class="{ 'drag-over': dragOverDate === day.dateStr }"
              @dragover.prevent="onDragOverDate(day.dateStr)"
              @dragleave="onDragLeaveDate(day.dateStr)"
              @drop.prevent="onDropOnDate(day.dateStr)"
            >
              <div
                v-for="(task, idx) in getTasksForDay(day.dateStr)"
                :key="'task-' + idx"
                class="task-card"
                draggable="true"
                @dragstart="onTaskDragStart({ ...task, type: 'task' }, day.dateStr, $event)"
                @dragend="onTaskDragEnd"
                @click="openTaskModal({ ...task, type: 'task' })"
                :style="{ backgroundColor: task.color }"
                :title="task.title"
              >
                <span class="task-title">{{ task.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAGESANSICHT MIT STUNDENPLAN -->
    <div v-if="viewMode === 'day'" class="week-card">
      <div class="week-header">
        <button
          @click="prevDay"
          class="nav-btn"
          :class="{ 'drag-over': dragOverRelativeTarget === -1 }"
          @dragover.prevent="onDragOverRelativeDay(-1)"
          @dragleave="onDragLeaveRelativeDay(-1)"
          @drop.prevent="onDropOnRelativeDay(-1)"
        >&lt;</button>
        <h2>{{ dayLable }}</h2>
        <button
          @click="nextDay"
          class="nav-btn"
          :class="{ 'drag-over': dragOverRelativeTarget === 1 }"
          @dragover.prevent="onDragOverRelativeDay(1)"
          @dragleave="onDragLeaveRelativeDay(1)"
          @drop.prevent="onDropOnRelativeDay(1)"
        >&gt;</button>
      </div>

      <div ref="dayTimetableRef" class="timetable-container">
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
                  :key="lesson.id"
                  class="lesson-card"
                  :style="[getLessonStyle(lesson), { backgroundColor: lesson.color }]"
                  :title="`${lesson.subject} - ${lesson.room}`"
                >
                  <div class="lesson-subject">{{ lesson.subject }}</div>
                  <div class="lesson-time">{{ lesson.startTime }}-{{ lesson.endTime }}</div>
                  <div class="lesson-room">{{ lesson.room }}</div>
                </div>
              </div>

              <div
                class="day-entries"
                :class="{ 'drag-over': dragOverDate === currentDayFormated.dateStr }"
                @dragover.prevent="onDragOverDate(currentDayFormated.dateStr)"
                @dragleave="onDragLeaveDate(currentDayFormated.dateStr)"
                @drop.prevent="onDropOnDate(currentDayFormated.dateStr)"
              >
                <div
                v-for="(evt, i) in currentDayEntries"
                :key="i"
                class="event-box"
                :class="evt.type === 'task' ? 'event-box--task' : 'event-box--event'"
                :draggable="evt.type === 'task'"
                @dragstart="onTaskDragStart(evt, currentDayFormated.dateStr, $event)"
                @dragend="onTaskDragEnd"
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

  <TaskForm 
    v-if="isModalOpen && selectedTask" 
    :task="selectedTask" 
    @save="handleSave"
    @save-with-subtasks="handleSaveWithSubtasks"
    @close="closeModal" 
  />
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
  align-items: center;
  gap: 10px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
}

.view-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 600;
  padding-left: 6px;
}

.view-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #333;
  font-weight: 500;
  padding: 8px 34px 8px 12px;
  cursor: pointer;
  min-width: 140px;
  background-image: linear-gradient(45deg, transparent 50%, #666 50%), linear-gradient(135deg, #666 50%, transparent 50%);
  background-position: calc(100% - 16px) calc(50% - 3px), calc(100% - 11px) calc(50% - 3px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.view-select:hover {
  border-color: #999;
}

.view-select:focus {
  outline: 2px solid #c7d2fe;
  outline-offset: 1px;
  border-color: #4f46e5;
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

.nav-btn.drag-over {
  background: #dfe3ff;
  color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.25);
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

.day-cell.drag-over {
  outline: 2px dashed #4f46e5;
  outline-offset: -2px;
  background-color: #eef0ff;
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

.event-box[draggable='true'] {
  cursor: grab;
}

.event-box[draggable='true']:active {
  cursor: grabbing;
}

/* ========== YEAR VIEW ========== */
.year-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.year-month-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  overflow: hidden;
}

.year-month-card:hover {
  transform: translateY(-1px);
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.year-month-card.is-current {
  border-color: #4f46e5;
  box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.2);
}

.year-month-header {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-bottom: 1px solid #e5e7eb;
  background: #f4f5f7;
}

.year-month-name {
  font-weight: 700;
  color: #23234c;
  text-transform: capitalize;
  font-size: 0.98rem;
}

.year-month-count {
  font-size: 0.85rem;
  color: #666;
  font-weight: 600;
}

.mini-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  border-bottom: 1px solid #e5e7eb;
}

.mini-weekday {
  text-align: center;
  font-size: 0.72rem;
  color: #6b7280;
  font-weight: 600;
  line-height: 1;
  padding: 5px 0;
  border-right: 1px solid #eef0f3;
  background: #f8f9fb;
}

.mini-weekday:last-child {
  border-right: none;
}

.mini-weekday.is-weekend {
  color: #4b5563;
  font-weight: 700;
}

.mini-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  padding: 6px 8px 8px;
  row-gap: 3px;
}

.mini-day-cell {
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: relative;
}

.mini-day-cell.is-padding {
  border: none;
  background: transparent;
}

.mini-day-cell.has-task {
  background: rgba(79, 70, 229, 0.10);
}

.mini-day-cell.is-today {
  outline: 1px solid #4f46e5;
  outline-offset: -1px;
}

.mini-day-number {
  font-size: 0.72rem;
  color: #374151;
  line-height: 1;
  font-weight: 600;
}

.mini-day-number.is-weekend {
  font-weight: 700;
}

.mini-day-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d62828;
  position: absolute;
  bottom: 2px;
}

.year-month-footer {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 8px 8px;
}

.year-task-overflow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9999px;
  background: #4f46e5;
  color: white;
  font-size: 0.68rem;
  font-weight: 700;
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
  border-top: 2px solid #e5e7eb;
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

.day-tasks.drag-over {
  background: #eef0ff;
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

.task-card[draggable='true'] {
  cursor: grab;
}

.task-card[draggable='true']:active {
  cursor: grabbing;
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

.day-entries.drag-over {
  background: #eef0ff;
  box-shadow: inset 0 0 0 2px rgba(79, 70, 229, 0.35);
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
  background-color: #25283a !important;
  border: 1px solid #3f445d !important;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35) !important;
}

:global(body.dark-mode) .tab-btn {
  background-color: #3b3b54 !important;
  border: 1px solid #555 !important;
  color: #ccc !important;
}

:global(body.dark-mode) .view-label {
  color: #ccc !important;
}

:global(body.dark-mode) .view-tabs {
  background-color: #2a2e44 !important;
  border: 1px solid #4e5470 !important;
}

:global(body.dark-mode) .header-row,
:global(body.dark-mode) .header-controls {
  color: #e6e9f2 !important;
}

:global(body.dark-mode) .view-select {
  background-color: #353a54 !important;
  border: 1px solid #646b89 !important;
  color: #f3f5fa !important;
  background-image: linear-gradient(45deg, transparent 50%, #bbb 50%), linear-gradient(135deg, #bbb 50%, transparent 50%) !important;
}

:global(body.dark-mode) .view-select:focus {
  outline: 2px solid #8f9cff !important;
  border-color: #8f9cff !important;
}

:global(body.dark-mode) .tab-btn.active {
  background-color: #4f46e5 !important;
  border-color: #4f46e5 !important;
  color: white !important;
}

:global(body.dark-mode) .btn-today {
  background-color: #353a54 !important;
  border: 1px solid #646b89 !important;
  color: #f5f7ff !important;
}

:global(body.dark-mode) .btn-today:hover {
  background-color: #4b4b6a !important;
}

:global(body.dark-mode) .nav-btn {
  background-color: #353a54 !important;
  color: #f2f4fb !important;
  border: 1px solid #646b89 !important;
}

:global(body.dark-mode) .nav-btn.drag-over {
  background-color: #454b78 !important;
  color: #dbe3ff !important;
  box-shadow: 0 0 0 2px rgba(122, 115, 255, 0.35) !important;
}

:global(body.dark-mode) .nav-btn:hover {
  background-color: #4b4b6a !important;
}

:global(body.dark-mode) .day-cell {
  background-color: #23273a !important;
  border: 1px solid #3c425b !important;
}

:global(body.dark-mode) .day-cell:hover {
  background-color: #2e334b !important;
}

:global(body.dark-mode) .day-cell.is-padding {
  background-color: transparent !important;
  border: none !important;
}

:global(body.dark-mode) .weekday {
  color: #b7bccb !important;
}

:global(body.dark-mode) .day-number {
  color: #ddd !important;
}

:global(body.dark-mode) .day-cell.is-today {
  border: 2px solid #3498db !important;
  background-color: #273852 !important;
}

:global(body.dark-mode) .day-cell.drag-over {
  background-color: #32376a !important;
  outline-color: #7a73ff !important;
}

/* CHANGED: dark mode for event-box (replaces event-dot) */
:global(body.dark-mode) .event-box {
  opacity: 0.9;
}

:global(body.dark-mode) .year-month-card {
  background-color: #2a2e44 !important;
  border-color: #4b516d !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25) !important;
}

:global(body.dark-mode) .year-month-card:hover {
  background-color: #353a54 !important;
  border-color: #6a7294 !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;
}

:global(body.dark-mode) .year-month-card.is-current {
  border-color: #8f9cff !important;
  background-color: #3a3f63 !important;
  box-shadow: 0 0 0 1px rgba(143, 156, 255, 0.4) !important;
}

:global(body.dark-mode) .year-month-header {
  background-color: #313752 !important;
  border-bottom-color: #525975 !important;
}

:global(body.dark-mode) .mini-weekdays {
  border-bottom-color: #525975 !important;
}

:global(body.dark-mode) .year-month-name,
:global(body.dark-mode) .year-month-count {
  color: #edf0fa !important;
}

:global(body.dark-mode) .mini-weekday {
  color: #d2d7e7 !important;
  background-color: #313752 !important;
  border-right-color: #4f5672 !important;
}

:global(body.dark-mode) .mini-weekday.is-weekend {
  color: #f2d08b !important;
}

:global(body.dark-mode) .mini-day-cell {
  background-color: transparent !important;
  border-color: transparent !important;
}

:global(body.dark-mode) .mini-day-cell.has-task {
  background-color: rgba(130, 144, 255, 0.24) !important;
  border-color: transparent !important;
}

:global(body.dark-mode) .mini-day-cell.is-today {
  outline: 1px solid #8f9cff !important;
  background-color: rgba(143, 156, 255, 0.18) !important;
}

:global(body.dark-mode) .mini-day-number {
  color: #f2f4fb !important;
}

:global(body.dark-mode) .mini-day-number.is-weekend {
  color: #f7dc9f !important;
}

:global(body.dark-mode) .mini-day-dot {
  background: #ff6b6b !important;
}

:global(body.dark-mode) .time-column {
  background-color: #24283b !important;
  border-right: 1px solid #3d435d !important;
}

:global(body.dark-mode) .time-header {
  border-bottom: 1px solid #4b516b !important;
  color: #d6dbe9 !important;
}

:global(body.dark-mode) .time-slot {
  color: #c0c6d8 !important;
  border-bottom: 1px solid #373d56 !important;
}

:global(body.dark-mode) .timetable-container {
  border: 1px solid #4b516b !important;
}

:global(body.dark-mode) .days-header {
  background-color: #24283b !important;
  border-bottom: 2px solid #4b516b !important;
}

:global(body.dark-mode) .day-header-cell {
  border-right: 1px solid #3a4059 !important;
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
  background-color: #24283b !important;
  border-top: 2px solid #4b516b !important;
}

:global(body.dark-mode) .day-tasks {
  border-right: 1px solid #3a4059 !important;
}

:global(body.dark-mode) .day-tasks.drag-over {
  background-color: #33386b !important;
}

:global(body.dark-mode) .day-entries.drag-over {
  background-color: #33386b !important;
  box-shadow: inset 0 0 0 2px rgba(122, 115, 255, 0.35) !important;
}

:global(body.dark-mode) .task-card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
}

:global(body.dark-mode) .task-card:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
}

:global(body.dark-mode) .task-title {
  color: #ffffff !important;
}

:global(body.dark-mode) .grid-cell {
  background-color: #2a2f45 !important;
  border-bottom: 1px solid #3a4059 !important;
}

:global(body.dark-mode) .grid-cell:nth-child(odd) {
  background-color: #24283b !important;
}

:global(body.dark-mode) .day-column-grid {
  border-right: 1px solid #3a4059 !important;
}

:global(body.dark-mode) .lesson-card {
  box-shadow: 0 2px 4px rgba(0,0,0,0.4) !important;
}

:global(body.dark-mode) .lesson-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.6) !important;
}

/* ========== DARK MODE FALLBACK (Layout + Body Trigger) ========== */
:global(body.dark-mode) .page-container,
:global(.app-container.dark-mode) .page-container {
  color: #e8ebf5 !important;
}

:global(body.dark-mode) .page-container .calendar-card,
:global(body.dark-mode) .page-container .week-card,
:global(.app-container.dark-mode) .page-container .calendar-card,
:global(.app-container.dark-mode) .page-container .week-card {
  background: #25283a !important;
  border: 1px solid #3f445d !important;
}

:global(body.dark-mode) .page-container .view-tabs,
:global(.app-container.dark-mode) .page-container .view-tabs {
  background: #2a2e44 !important;
  border: 1px solid #4e5470 !important;
}

:global(body.dark-mode) .page-container .view-select,
:global(.app-container.dark-mode) .page-container .view-select,
:global(body.dark-mode) .page-container .btn-today,
:global(.app-container.dark-mode) .page-container .btn-today,
:global(body.dark-mode) .page-container .nav-btn,
:global(.app-container.dark-mode) .page-container .nav-btn {
  background: #353a54 !important;
  border-color: #646b89 !important;
  color: #f5f7ff !important;
}

:global(body.dark-mode) .page-container .weekday,
:global(.app-container.dark-mode) .page-container .weekday,
:global(body.dark-mode) .page-container .day-number,
:global(.app-container.dark-mode) .page-container .day-number,
:global(body.dark-mode) .page-container .day-name,
:global(.app-container.dark-mode) .page-container .day-name,
:global(body.dark-mode) .page-container .day-date,
:global(.app-container.dark-mode) .page-container .day-date,
:global(body.dark-mode) .page-container .year-month-name,
:global(.app-container.dark-mode) .page-container .year-month-name,
:global(body.dark-mode) .page-container .mini-day-number,
:global(.app-container.dark-mode) .page-container .mini-day-number,
:global(body.dark-mode) .page-container .mini-weekday,
:global(.app-container.dark-mode) .page-container .mini-weekday {
  color: #edf0fa !important;
}

:global(body.dark-mode) .page-container .day-cell,
:global(.app-container.dark-mode) .page-container .day-cell,
:global(body.dark-mode) .page-container .year-month-card,
:global(.app-container.dark-mode) .page-container .year-month-card,
:global(body.dark-mode) .page-container .time-column,
:global(.app-container.dark-mode) .page-container .time-column,
:global(body.dark-mode) .page-container .days-header,
:global(.app-container.dark-mode) .page-container .days-header,
:global(body.dark-mode) .page-container .tasks-row,
:global(.app-container.dark-mode) .page-container .tasks-row,
:global(body.dark-mode) .page-container .grid-cell,
:global(.app-container.dark-mode) .page-container .grid-cell {
  background-color: #262b3f !important;
  border-color: #3d435d !important;
}

:global(body.dark-mode) .page-container .grid-cell:nth-child(odd),
:global(.app-container.dark-mode) .page-container .grid-cell:nth-child(odd) {
  background-color: #23283b !important;
}

:global(body.dark-mode) .page-container .timetable-container,
:global(.app-container.dark-mode) .page-container .timetable-container,
:global(body.dark-mode) .page-container .day-header-cell,
:global(.app-container.dark-mode) .page-container .day-header-cell,
:global(body.dark-mode) .page-container .day-column-grid,
:global(.app-container.dark-mode) .page-container .day-column-grid,
:global(body.dark-mode) .page-container .day-tasks,
:global(.app-container.dark-mode) .page-container .day-tasks,
:global(body.dark-mode) .page-container .time-slot,
:global(.app-container.dark-mode) .page-container .time-slot,
:global(body.dark-mode) .page-container .time-header,
:global(.app-container.dark-mode) .page-container .time-header,
:global(body.dark-mode) .page-container .mini-weekdays,
:global(.app-container.dark-mode) .page-container .mini-weekdays,
:global(body.dark-mode) .page-container .year-month-header,
:global(.app-container.dark-mode) .page-container .year-month-header {
  border-color: #4b516b !important;
}

:global(body.dark-mode) .modal-close-btn {
  background: #2f3248 !important;
  border-color: #555a73 !important;
  color: #e6e8ef !important;
}

:global(body.dark-mode) .modal-close-btn:hover {
  background: #3b4060 !important;
}
</style>

<style>
body.dark-mode .page-container,
.app-container.dark-mode .page-container {
  color: #e8ebf5 !important;
}

body.dark-mode .page-container .calendar-card,
body.dark-mode .page-container .week-card,
.app-container.dark-mode .page-container .calendar-card,
.app-container.dark-mode .page-container .week-card {
  background: #25283a !important;
  border: 1px solid #3f445d !important;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35) !important;
}

body.dark-mode .page-container .view-tabs,
.app-container.dark-mode .page-container .view-tabs {
  background: #2a2e44 !important;
  border: 1px solid #4e5470 !important;
}

body.dark-mode .page-container .view-label,
.app-container.dark-mode .page-container .view-label,
body.dark-mode .page-container .weekday,
.app-container.dark-mode .page-container .weekday,
body.dark-mode .page-container .day-number,
.app-container.dark-mode .page-container .day-number,
body.dark-mode .page-container .day-name,
.app-container.dark-mode .page-container .day-name,
body.dark-mode .page-container .day-date,
.app-container.dark-mode .page-container .day-date,
body.dark-mode .page-container .year-month-name,
.app-container.dark-mode .page-container .year-month-name,
body.dark-mode .page-container .year-month-count,
.app-container.dark-mode .page-container .year-month-count,
body.dark-mode .page-container .mini-weekday,
.app-container.dark-mode .page-container .mini-weekday,
body.dark-mode .page-container .mini-day-number,
.app-container.dark-mode .page-container .mini-day-number,
body.dark-mode .page-container .time-header,
.app-container.dark-mode .page-container .time-header,
body.dark-mode .page-container .time-slot,
.app-container.dark-mode .page-container .time-slot,
body.dark-mode .page-container .page-title,
.app-container.dark-mode .page-container .page-title,
body.dark-mode .page-container .cal-header h2,
.app-container.dark-mode .page-container .cal-header h2,
body.dark-mode .page-container .week-header h2,
.app-container.dark-mode .page-container .week-header h2 {
  color: #eef2ff !important;
}

body.dark-mode .page-container .view-select,
.app-container.dark-mode .page-container .view-select,
body.dark-mode .page-container .btn-today,
.app-container.dark-mode .page-container .btn-today,
body.dark-mode .page-container .nav-btn,
.app-container.dark-mode .page-container .nav-btn {
  background: #353a54 !important;
  border: 1px solid #646b89 !important;
  color: #f5f7ff !important;
}

body.dark-mode .page-container .day-cell,
.app-container.dark-mode .page-container .day-cell,
body.dark-mode .page-container .year-month-card,
.app-container.dark-mode .page-container .year-month-card,
body.dark-mode .page-container .time-column,
.app-container.dark-mode .page-container .time-column,
body.dark-mode .page-container .days-header,
.app-container.dark-mode .page-container .days-header,
body.dark-mode .page-container .tasks-row,
.app-container.dark-mode .page-container .tasks-row,
body.dark-mode .page-container .grid-cell,
.app-container.dark-mode .page-container .grid-cell,
body.dark-mode .page-container .year-month-header,
.app-container.dark-mode .page-container .year-month-header,
body.dark-mode .page-container .mini-weekday,
.app-container.dark-mode .page-container .mini-weekday {
  background-color: #262b3f !important;
  border-color: #465070 !important;
}

body.dark-mode .page-container .grid-cell:nth-child(odd),
.app-container.dark-mode .page-container .grid-cell:nth-child(odd) {
  background-color: #22273a !important;
}

body.dark-mode .page-container .timetable-container,
.app-container.dark-mode .page-container .timetable-container,
body.dark-mode .page-container .day-header-cell,
.app-container.dark-mode .page-container .day-header-cell,
body.dark-mode .page-container .day-column-grid,
.app-container.dark-mode .page-container .day-column-grid,
body.dark-mode .page-container .day-tasks,
.app-container.dark-mode .page-container .day-tasks,
body.dark-mode .page-container .mini-weekdays,
.app-container.dark-mode .page-container .mini-weekdays {
  border-color: #465070 !important;
}

body.dark-mode .page-container .day-cell:hover,
.app-container.dark-mode .page-container .day-cell:hover,
body.dark-mode .page-container .year-month-card:hover,
.app-container.dark-mode .page-container .year-month-card:hover {
  background-color: #313752 !important;
}

body.dark-mode .page-container .day-cell.is-padding,
.app-container.dark-mode .page-container .day-cell.is-padding,
body.dark-mode .page-container .mini-day-cell,
.app-container.dark-mode .page-container .mini-day-cell {
  background-color: transparent !important;
}

body.dark-mode .page-container .mini-day-cell.has-task,
.app-container.dark-mode .page-container .mini-day-cell.has-task {
  background-color: rgba(130, 144, 255, 0.24) !important;
}

body.dark-mode .page-container .mini-day-cell.is-today,
.app-container.dark-mode .page-container .mini-day-cell.is-today {
  outline: 1px solid #8f9cff !important;
  background-color: rgba(143, 156, 255, 0.18) !important;
}

body.dark-mode .page-container .day-cell.is-today,
.app-container.dark-mode .page-container .day-cell.is-today,
body.dark-mode .page-container .day-header-cell.is-today,
.app-container.dark-mode .page-container .day-header-cell.is-today {
  background-color: #273852 !important;
}

body.dark-mode .page-container .task-title,
.app-container.dark-mode .page-container .task-title {
  color: #ffffff !important;
}

body.dark-mode .page-container > .modal-overlay > .modal-content,
.app-container.dark-mode .page-container > .modal-overlay > .modal-content {
  background: #1f2333 !important;
  border: 1px solid #434963 !important;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55) !important;
}

body.dark-mode .page-container > .modal-overlay > .modal-content .task-form,
.app-container.dark-mode .page-container > .modal-overlay > .modal-content .task-form {
  background: #1f2333 !important;
}

body.dark-mode .page-container > .modal-overlay > .modal-content .form-actions,
.app-container.dark-mode .page-container > .modal-overlay > .modal-content .subtask-builder,
.app-container.dark-mode .page-container > .modal-overlay > .modal-content .form-actions,
body.dark-mode .page-container > .modal-overlay > .modal-content .subtask-builder {
  background: transparent !important;
}
</style>
