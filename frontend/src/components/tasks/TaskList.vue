<template>
    <div class="task-list">
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @edit="editTask"
        @delete="deleteTask"
      />
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
  
  defineEmits(['edit', 'delete']);
  
  const editTask = (task) => {
    emit('edit', task);
  };
  
  const deleteTask = (task) => {
    emit('delete', task);
  };
  </script>
  
  <style scoped>
  .empty-state {
    text-align: center;
    color: #888;
    margin-top: 40px;
    font-size: 1.2rem;
  }
  </style>