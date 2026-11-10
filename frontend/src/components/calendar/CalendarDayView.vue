<script setup>
import { ref, computed, onMounted } from 'vue';
import { getWeekDays, getWeekStart, weekdayIndex } from '@/composables/useCalendarUtils';
import CalendarLessonsLayer from '@/components/calendar/CalendarLessonsLayer.vue';
import { TIME_SLOTS, scrollToDefaultTime } from '@/components/calendar/timetable';

// the day view (M28, out of CalendarView): the day's lessons and tasks; a task
// dropped on an arrow moves a day earlier or later
const props = defineProps({
  date: { type: Date, required: true },
  lessons: { type: Array, required: true },
  events: { type: Array, required: true },
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

const entries = computed(() =>
  props.events.filter((event) => event.date === day.value.dateKey).map((event) => ({ ...event, type: 'task' })),
);

// the task blocks stack from the top, each a little to the right (before
// M28 a `top` from a deadline the entries don't carry came out invalid and
// was dropped by the browser, with the same result; review M28)
const taskStyle = (index) => ({
  height: '35px',
  left: `${30 + index * 20}px`,
  width: '160px',
  backgroundColor: '#4f46e5',
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
  pointerEvents: 'auto',
});

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

    <div ref="timetable" class="timetable-container">
      <div class="time-column">
        <div class="time-header">Zeit</div>
        <div v-for="time in TIME_SLOTS" :key="time" class="time-slot">{{ time }}</div>
      </div>

      <div class="days-column">
        <div class="days-header days-header--day">
          <div :class="{ 'is-today': day.isToday }" class="day-header-cell">
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-date">{{ day.date.getDate() }}</div>
          </div>
        </div>

        <div class="grid-wrapper grid-wrapper--day">
          <div class="day-column-grid">
            <div v-for="time in TIME_SLOTS" :key="time" class="grid-cell"></div>
            <CalendarLessonsLayer :lessons="lessonsToday" />

            <div
              class="day-entries"
              :class="{ 'drag-over': drag.dragOverDate === day.dateKey }"
              @dragover.prevent="drag.overDate(day.dateKey)"
              @dragleave="drag.leaveDate(day.dateKey)"
              @drop.prevent="drag.dropOnDate(day.dateKey)"
            >
              <div
                v-for="(evt, i) in entries"
                :key="i"
                class="event-box"
                :class="evt.type === 'task' ? 'event-box--task' : 'event-box--event'"
                :draggable="evt.type === 'task'"
                @dragstart="drag.start(evt, day.dateKey, $event)"
                @dragend="drag.end()"
                @click="emit('open-task', evt)"
                :style="taskStyle(i)"
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
</template>
