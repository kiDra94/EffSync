<script setup>
import { lessonStyle } from '@/components/calendar/timetable';

// the lessons of one day over the time grid (M28, week and day view)
defineProps({
  lessons: { type: Array, required: true },
});
</script>

<template>
  <div class="lessons-layer">
    <div
      v-for="lesson in lessons"
      :key="lesson.id"
      class="lesson-card"
      :style="[lessonStyle(lesson), { backgroundColor: lesson.color }]"
      :title="`${lesson.subject} - ${lesson.room}`"
    >
      <div class="lesson-subject">{{ lesson.subject }}</div>
      <div class="lesson-time">{{ lesson.startTime }}-{{ lesson.endTime }}</div>
      <div class="lesson-room">{{ lesson.room }}</div>
    </div>
  </div>
</template>
