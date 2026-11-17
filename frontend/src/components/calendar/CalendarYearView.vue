<script setup>
import { computed } from 'vue';
import { formatDateKey, weekdayIndex, WEEKDAY_NAMES } from '@/composables/useCalendarUtils';

// the year view (M28, out of CalendarView): twelve small months with a dot on
// the days with tasks; a click opens the month
const props = defineProps({
  year: { type: Number, required: true },
  // tasks with a deadline
  tasks: { type: Array, required: true },
});
const emit = defineEmits(['prev', 'next', 'open-month']);

const months = computed(() => {
  const now = new Date();
  const tasksPerDay = new Map();
  for (const task of props.tasks) {
    const deadline = task?.deadline ? new Date(task.deadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime()) || deadline.getFullYear() !== props.year) continue;
    const key = formatDateKey(deadline);
    tasksPerDay.set(key, (tasksPerDay.get(key) ?? 0) + 1);
  }

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const firstDay = new Date(props.year, monthIndex, 1);
    const daysInMonth = new Date(props.year, monthIndex + 1, 0).getDate();
    const startDayIndex = weekdayIndex(firstDay);
    const isCurrentMonth = now.getFullYear() === props.year && now.getMonth() === monthIndex;

    const miniDays = Array.from({ length: startDayIndex }, (_, i) => ({
      key: `pad-${monthIndex}-${i}`,
      isPadding: true,
      day: '',
    }));
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(new Date(props.year, monthIndex, day));
      const taskCount = tasksPerDay.get(dateStr) ?? 0;
      const weekday = (startDayIndex + day - 1) % 7;
      count += taskCount;
      miniDays.push({
        key: dateStr,
        isPadding: false,
        day,
        isWeekend: weekday >= 5,
        hasTasks: taskCount > 0,
        isToday: isCurrentMonth && now.getDate() === day,
      });
    }

    return {
      monthIndex,
      label: firstDay.toLocaleString('de-DE', { month: 'long' }),
      count,
      overflowCount: count > 5 ? count : 0,
      isCurrentMonth,
      miniDays,
    };
  });
});
</script>

<template>
  <div class="calendar-card">
    <div class="cal-header">
      <button @click="emit('prev')" class="nav-btn">&lt;</button>
      <h2>{{ year }}</h2>
      <button @click="emit('next')" class="nav-btn">&gt;</button>
    </div>

    <div class="year-grid">
      <button
        v-for="month in months"
        :key="month.monthIndex"
        class="year-month-card"
        :class="{ 'is-current': month.isCurrentMonth }"
        @click="emit('open-month', month.monthIndex)"
        :title="`${month.label}: ${month.count} Tasks`"
      >
        <div class="year-month-header">
          <span class="year-month-name">{{ month.label }}</span>
        </div>

        <div class="mini-weekdays">
          <span
            v-for="(weekday, weekdayIdx) in WEEKDAY_NAMES"
            :key="`${month.monthIndex}-${weekday}`"
            class="mini-weekday"
            :class="{ 'is-weekend': weekdayIdx >= 5 }"
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
              'is-weekend': cell.isWeekend,
            }"
          >
            <span v-if="!cell.isPadding" class="mini-day-number" :class="{ 'is-weekend': cell.isWeekend }">
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
</template>
