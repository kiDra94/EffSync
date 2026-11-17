<script setup>
import { computed } from 'vue';
import { formatDateKey, weekdayIndex, WEEKDAY_NAMES } from '@/composables/useCalendarUtils';

// the month view (M28, out of CalendarView): the tasks on their days; a task
// is dragged onto another day
const props = defineProps({
  date: { type: Date, required: true },
  events: { type: Array, required: true },
  drag: { type: Object, required: true },
});
const emit = defineEmits(['prev', 'next', 'open-task']);

const monthName = computed(() => props.date.toLocaleString('de-DE', { month: 'long', year: 'numeric' }));

const days = computed(() => {
  const year = props.date.getFullYear();
  const month = props.date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = formatDateKey(new Date());
  const cells = Array.from({ length: weekdayIndex(new Date(year, month, 1)) }, () => ({
    day: '',
    fullDate: null,
    isPadding: true,
  }));
  for (let day = 1; day <= daysInMonth; day++) {
    const fullDate = formatDateKey(new Date(year, month, day));
    cells.push({
      day,
      fullDate,
      isPadding: false,
      isToday: fullDate === today,
      events: props.events.filter((event) => event.date === fullDate).map((event) => ({ ...event, type: 'task' })),
    });
  }
  return cells;
});
</script>

<template>
  <div class="calendar-card">
    <div class="cal-header">
      <button @click="emit('prev')" class="nav-btn">&lt;</button>
      <h2>{{ monthName }}</h2>
      <button @click="emit('next')" class="nav-btn">&gt;</button>
    </div>

    <div class="weekdays-row">
      <div v-for="day in WEEKDAY_NAMES" :key="day" class="weekday">{{ day }}</div>
    </div>

    <div class="days-grid">
      <div
        v-for="(dayObj, index) in days"
        :key="index"
        class="day-cell"
        :class="{
          'is-padding': dayObj.isPadding,
          'is-today': dayObj.isToday,
          'drag-over': !dayObj.isPadding && drag.dragOverDate === dayObj.fullDate,
        }"
        @dragover.prevent="drag.overDate(dayObj.fullDate)"
        @dragleave="drag.leaveDate(dayObj.fullDate)"
        @drop.prevent="drag.dropOnDate(dayObj.fullDate)"
      >
        <span v-if="!dayObj.isPadding" class="day-number">{{ dayObj.day }}</span>

        <div class="events-container">
          <div
            v-for="(evt, i) in dayObj.events"
            :key="i"
            class="event-box"
            :class="evt.type === 'task' ? 'event-box--task' : 'event-box--event'"
            :draggable="evt.type === 'task'"
            @dragstart="drag.start(evt, dayObj.fullDate, $event)"
            @dragend="drag.end()"
            @click="emit('open-task', evt)"
            :style="{ backgroundColor: evt.color }"
            :title="evt.title"
          >
            {{ evt.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
