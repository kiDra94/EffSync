<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Aufgabe löschen?</h2>
      </div>
      <div class="modal-body">
        <p>Möchtest du diese Aufgabe wirklich löschen?</p>
        <p v-if="task" class="task-preview">
          <strong>{{ task.title }}</strong>
        </p>
        <p class="warning-text">Diese Aktion kann nicht rückgängig gemacht werden.</p>
      </div>
      <div class="modal-actions">
        <button @click="confirmDelete" class="btn-danger">Löschen</button>
        <button @click="close" class="btn-secondary">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['delete', 'close']);

const confirmDelete = () => {
  emit('delete');
};

const close = () => {
  emit('close');
};
</script>