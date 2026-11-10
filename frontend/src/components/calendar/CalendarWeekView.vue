<script setup>
import { ref, computed, onMounted } from 'vue';
import { getWeekDays, getWeekStart } from '@/composables/useCalendarUtils';
import CalendarLessonsLayer from '@/components/calendar/CalendarLessonsLayer.vue';
import CalendarTaskList from '@/components/calendar/CalendarTaskList.vue';
import { TIME_SLOTS, scrollToDefaultTime, tasksOnDay } from '@/components/calendar/timetable';

// the week view (M28, out of CalendarView): the days from Monday with their
// tasks above the timetable of the lessons; a task is dragged onto another day
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
const tasksByDay = computed(() => days.value.map((day) => tasksOnDay(props.tasks, day.dateKey)));

onMounted(() => scrollToDefaultTime(timetable.value));
</script>

<template>
  <div class="week-card">
    <div class="week-header">
      <button @click="emit('prev')" class="nav-btn">&lt;</button>
      <h2>{{ label }}</h2>
      <button @click="emit('next')" class="nav-btn">&gt;</button>
    </div>

    <!-- the days and their tasks stay in sight above the scrolling grid -->
    <div class="timetable-top">
      <div class="time-header">Zeit</div>
      <div class="days-header">
        <div v-for="day in days" :key="day.dayOfWeek" :class="{ 'is-today': day.isToday }" class="day-header-cell">
          <div class="day-name">{{ day.dayName }}</div>
          <div class="day-date">{{ day.date.getDate() }}</div>
        </div>
      </div>
      <div class="time-header tasks-label">Aufgaben</div>
      <div class="tasks-row">
        <CalendarTaskList v-for="day in days" :key="'tasks-' + day.dayOfWeek" :date-key="day.dateKey"
          :tasks="tasksByDay[day.dayOfWeek]" :drag="drag" @open-task="emit('open-task', $event)" />
      </div>
    </div>

    <div ref="timetable" class="timetable-container">
      <div class="time-column">
        <div v-for="time in TIME_SLOTS" :key="time" class="time-slot">{{ time }}</div>
      </div>

      <div class="days-column">
        <div class="grid-wrapper">
          <div v-for="day in days" :key="day.dayOfWeek" class="day-column-grid">
            <div v-for="time in TIME_SLOTS" :key="time" class="grid-cell"></div>
            <CalendarLessonsLayer :lessons="lessonsByDay[day.dayOfWeek]" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
