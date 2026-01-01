<template>
  <form @submit.prevent="submitTask">
    <label for="title">Titel:</label>
    <input v-model="formData.title" id="title" required />

    <label for="dueDate">Fälligkeitsdatum:</label>
    <input type="date" v-model="formData.dueDate" id="dueDate" required />

    <label for="priority">Priorität:</label>
    <select v-model="formData.priority" id="priority">
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
import { reactive } from 'vue';

const props = defineProps({
  task: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['save', 'close']);

const formData = reactive({
  title: props.task?.title || '',
  subject: props.task?.subject || '',
  dueDate: props.task?.dueDate || '',
  priority: props.task?.priority || 'medium',
  status: props.task?.status || 'open'
});

const submitTask = () => {
  const taskData = {
    ...formData,
    ...(props.task?.id && { id: props.task.id})
  }
  emit('save', { ...formData });
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
/* Styles für das Formular */
</style>