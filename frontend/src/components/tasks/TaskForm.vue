<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</h2>
        <button @click="close" class="close-btn" aria-label="Schließen">×</button>
      </div>

      <form @submit.prevent="submitTask" class="task-form">
        <div class="form-group">
          <label for="title">Titel *</label>
          <input 
            v-model="formData.title" 
            id="title" 
            type="text"
            required 
            placeholder="z.B. API-Struktur implementieren"
          />
        </div>

        <div class="form-group">
          <label for="description">Beschreibung</label>
          <textarea 
            v-model="formData.description" 
            id="description" 
            rows="3"
            placeholder="Detaillierte Beschreibung der Aufgabe"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="deadline">Deadline *</label>
          <input 
            type="datetime-local" 
            v-model="formData.deadline" 
            id="deadline" 
            required 
          />
        </div>

        <div class="form-group">
          <label for="priority_id">Priorität</label>
          <select v-model.number="formData.priority_id" id="priority_id">
            <option :value="1">Niedrig</option>
            <option :value="2">Mittel</option>
            <option :value="3">Hoch</option>
            <option :value="4">Dringend</option>
          </select>
        </div>

        <div class="form-group">
          <label for="status">Status</label>
          <select v-model="formData.status" id="status">
            <option value="TODO">Zu erledigen</option>
            <option value="IN_PROGRESS">In Bearbeitung</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="ON_HOLD">Pausiert</option>
            <option value="COMPLETED">Abgeschlossen</option>
          </select>
        </div>

        <div class="form-group">
          <label for="progress">Fortschritt (%)</label>
          <div class="progress-input-group">
            <input 
              type="range" 
              v-model.number="formData.progress" 
              id="progress" 
              min="0" 
              max="100"
              class="progress-slider"
            />
            <input 
              type="number" 
              v-model.number="formData.progress" 
              min="0" 
              max="100"
              class="progress-number"
            />
            <span class="progress-label">%</span>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            {{ task ? 'Speichern' : 'Erstellen' }}
          </button>
          <button type="button" @click="close" class="btn-secondary">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  </div>
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
    ...(props.task?.id && { id: props.task.id })
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