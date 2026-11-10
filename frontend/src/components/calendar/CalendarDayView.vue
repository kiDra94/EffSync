<script setup>
import { ref, computed, onMounted } from 'vue';
import { getWeekDays, getWeekStart, weekdayIndex } from '@/composables/useCalendarUtils';
import CalendarLessonsLayer from '@/components/calendar/CalendarLessonsLayer.vue';
import CalendarTaskList from '@/components/calendar/CalendarTaskList.vue';
import { TIME_SLOTS, scrollToDefaultTime, tasksOnDay } from '@/components/calendar/timetable';

// the day view (M28, out of CalendarView): the day's tasks above the timetable
// of its lessons; a task dropped on an arrow moves a day earlier or later
const props = defineProps({
  date: { type: Date, required: true },
  lessons: { type: Array, required: true },
  // the open tasks from the store, by deadline
  tasks: { type: Array, required: true },
  drag: { type: Object, required: true },
});
const emit = defineEmits(['prev', 'next', 'open-task']);

const timetable = ref(null);

const day = computed(() => {
  const dayOfWeek = weekdayIndex(props.date);
  return { ...getWeekDays(getWeekStart(props.date))[dayOfWeek], dayOfWeek };
});

// the lessons come sorted by start time
const lessonsToday = computed(() => props.lessons.filter((lesson) => lesson.dayOfWeek === day.value.dayOfWeek));
const tasksToday = computed(() => tasksOnDay(props.tasks, day.value.dateKey));

onMounted(() => scrollToDefaultTime(timetable.value));
</script>

<template>
  <div class="week-card">
    <div class="week-header">
      <button
        @click="emit('prev')"
        class="nav-btn"
        :class="{ 'drag-over': drag.dragOverRelativeTarget === -1 }"
        @dragover.prevent="drag.overRelative(-1)"
        @dragleave="drag.leaveRelative(-1)"
        @drop.prevent="drag.dropOnRelative(-1)"
      >&lt;</button>
      <h2>{{ date.toLocaleDateString('de-DE') }}</h2>
      <button
        @click="emit('next')"
        class="nav-btn"
        :class="{ 'drag-over': drag.dragOverRelativeTarget === 1 }"
        @dragover.prevent="drag.overRelative(1)"
        @dragleave="drag.leaveRelative(1)"
        @drop.prevent="drag.dropOnRelative(1)"
      >&gt;</button>
    </div>

    <!-- the day and its tasks stay in sight above the scrolling grid -->
    <div class="timetable-top">
      <div class="time-header">Zeit</div>
      <div class="days-header days-header--day">
        <div :class="{ 'is-today': day.isToday }" class="day-header-cell">
          <div class="day-name">{{ day.dayName }}</div>
          <div class="day-date">{{ day.date.getDate() }}</div>
        </div>
      </div>
      <div class="time-header tasks-label">Aufgaben</div>
      <div class="tasks-row tasks-row--day">
        <CalendarTaskList :date-key="day.dateKey" :tasks="tasksToday" :drag="drag"
          @open-task="emit('open-task', $event)" />
      </div>
    </div>

    <div ref="timetable" class="timetable-container">
      <div class="time-column">
        <div v-for="time in TIME_SLOTS" :key="time" class="time-slot">{{ time }}</div>
      </div>

      <div class="days-column">
        <div class="grid-wrapper grid-wrapper--day">
          <div class="day-column-grid">
            <div v-for="time in TIME_SLOTS" :key="time" class="grid-cell"></div>
            <CalendarLessonsLayer :lessons="lessonsToday" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
