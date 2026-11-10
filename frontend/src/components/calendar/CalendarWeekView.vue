<script setup>
import { ref, computed, onMounted } from 'vue';
import { getWeekDays, getWeekStart } from '@/composables/useCalendarUtils';
import CalendarLessonsLayer from '@/components/calendar/CalendarLessonsLayer.vue';
import { TIME_SLOTS, PRIORITY_COLORS, scrollToDefaultTime } from '@/components/calendar/timetable';

// the week view (M28, out of CalendarView): the timetable from Monday with
// the lessons, and the tasks under each day; a task is dragged onto another day
const props = defineProps({
  date: { type: Date, required: true },
  lessons: { type: Array, required: true },
  // the open tasks from the store, by deadline
  tasks: { type: Array, required: true },
  drag: { type: Object, required: true },
});
const emit = defineEmits(['prev', 'next', 'open-task']);

const timetable = ref(null);

const weekStart = computed(() => getWeekStart(props.date));
const days = computed(() =>
  getWeekDays(weekStart.value).map((day, dayOfWeek) => ({ ...day, dayOfWeek })),
);
const label = computed(() => {
  const end = new Date(weekStart.value);
  end.setDate(end.getDate() + 6);
  return `${weekStart.value.toLocaleDateString('de-DE')} - ${end.toLocaleDateString('de-DE')}`;
});

// per day once per data change, not on every render during a drag (review
// M28); the lessons come sorted by start time
const lessonsByDay = computed(() =>
  days.value.map((day) => props.lessons.filter((lesson) => lesson.dayOfWeek === day.dayOfWeek)),
);

// by the deadline's text, i.e. its UTC date (as before M28; the month and day
// views use the local date, see PROGRESS.md M28)
const tasksByDay = computed(() =>
  days.value.map((day) =>
    props.tasks
      .filter((task) => task.deadline && String(task.deadline).startsWith(day.dateKey))
      .map((task) => ({
        id: task.task_id ?? task.id,
        date: day.dateKey,
        title: task.title,
        color: PRIORITY_COLORS[task.priority_id] || '#4f46e5',
        description: task.description,
        status: task.status,
        type: 'task',
      })),
  ),
);

onMounted(() => scrollToDefaultTime(timetable.value));
</script>

<template>
  <div class="week-card">
    <div class="week-header">
      <button @click="emit('prev')" class="nav-btn">&lt;</button>
      <h2>{{ label }}</h2>
      <button @click="emit('next')" class="nav-btn">&gt;</button>
    </div>

    <div ref="timetable" class="timetable-container">
      <div class="time-column">
        <div class="time-header">Zeit</div>
        <div v-for="time in TIME_SLOTS" :key="time" class="time-slot">{{ time }}</div>
      </div>

      <div class="days-column">
        <div class="days-header">
          <div v-for="day in days" :key="day.dayOfWeek" :class="{ 'is-today': day.isToday }" class="day-header-cell">
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-date">{{ day.date.getDate() }}</div>
          </div>
        </div>

        <div class="grid-wrapper">
          <div v-for="day in days" :key="day.dayOfWeek" class="day-column-grid">
            <div v-for="time in TIME_SLOTS" :key="time" class="grid-cell"></div>
            <CalendarLessonsLayer :lessons="lessonsByDay[day.dayOfWeek]" />
          </div>
        </div>

        <!-- the tasks under the timetable -->
        <div class="tasks-row">
          <div
            v-for="day in days"
            :key="'tasks-' + day.dayOfWeek"
            class="day-tasks"
            :class="{ 'drag-over': drag.dragOverDate === day.dateKey }"
            @dragover.prevent="drag.overDate(day.dateKey)"
            @dragleave="drag.leaveDate(day.dateKey)"
            @drop.prevent="drag.dropOnDate(day.dateKey)"
          >
            <div
              v-for="(task, idx) in tasksByDay[day.dayOfWeek]"
              :key="'task-' + idx"
              class="task-card"
              draggable="true"
              @dragstart="drag.start(task, day.dateKey, $event)"
              @dragend="drag.end()"
              @click="emit('open-task', task)"
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
</template>
