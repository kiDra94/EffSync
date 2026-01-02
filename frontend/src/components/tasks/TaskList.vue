<template>
  <div class="task-list">
    <TaskCard v-for="task in tasks" :key="task.task_id" :task="task" @edit="editTask" @delete="deleteTask"
      @toggle-status="toggleStatus" @change-status="changeStatus" />
    <div v-if="tasks.length === 0" class="empty-state">
      <p>Keine Aufgaben gefunden 🤷‍♂️</p>
    </div>
  </div>
</template>

<script setup>
import TaskCard from './TaskCard.vue';

defineProps({
  tasks: Array
});

const emit = defineEmits(['edit', 'delete', 'toggle-status', 'change-status']);

const editTask = (task) => {
  emit('edit', task);
};

const deleteTask = (task) => {
  emit('delete', task);
};

const toggleStatus = (task) => {
  emit('toggle-status', task);
}

const changeStatus = (task, newStatus) => {
  emit('change-status', task, newStatus);
}
</script>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.empty-state {
  text-align: center;
  color: #888;
  margin-top: 40px;
  font-size: 1.2rem;
}
</style>