<template>
    <form @submit.prevent="submitTask">
      <label for="title">Titel:</label>
      <input v-model="task.title" id="title" required />
  
      <label for="dueDate">Fälligkeitsdatum:</label>
      <input type="date" v-model="task.dueDate" id="dueDate" required />
  
      <label for="priority">Priorität:</label>
      <select v-model="task.priority" id="priority">
        <option value="low">Niedrig</option>
        <option value="medium">Mittel</option>
        <option value="high">Hoch</option>
      </select>
  
      <div class="form-actions">
        <button type="submit">Speichern</button>
        <button type="button" @click="close">Abbrechen</button>
      </div>
    </form>
  </template>
  
  <script setup>
  defineProps({
    task: Object,
  });
  
  defineEmits(['save', 'close']);
  
  const submitTask = () => {
    emit('save', task);
  };
  </script>
  
  <style scoped>
  /* Styles für das Formular */
  </style>