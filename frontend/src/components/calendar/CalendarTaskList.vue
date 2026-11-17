<script setup>
// one day's tasks in the week and day views, a drop target for moving a task
// to that day (manual check M28: in sight above the time grid)
defineProps({
  dateKey: { type: String, required: true },
  tasks: { type: Array, required: true },
  drag: { type: Object, required: true },
});
const emit = defineEmits(['open-task']);
</script>

<template>
  <div
    class="day-tasks"
    :class="{ 'drag-over': drag.dragOverDate === dateKey }"
    @dragover.prevent="drag.overDate(dateKey)"
    @dragleave="drag.leaveDate(dateKey)"
    @drop.prevent="drag.dropOnDate(dateKey)"
  >
    <div
      v-for="task in tasks"
      :key="task.id"
      class="task-card"
      draggable="true"
      @dragstart="drag.start(task, dateKey, $event)"
      @dragend="drag.end()"
      @click="emit('open-task', task)"
      :style="{ backgroundColor: task.color }"
      :title="task.time ? `${task.time} ${task.title}` : task.title"
    >
      <span v-if="task.time" class="task-time">{{ task.time }}</span>
      <span class="task-title">{{ task.title }}</span>
    </div>
  </div>
</template>
