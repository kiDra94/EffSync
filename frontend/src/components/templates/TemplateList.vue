<template>
  <div class="template-list">
    <TemplateCard v-for="template in templates" :key="template.task_id" :template="template" @edit="editTemplate"
      @delete="deleteTemplate" @toggle-status="toggleStatus" />
    <div v-if="templates.length === 0" class="empty-state">
      <p>Keine Aufgaben gefunden 🤷‍♂️</p>
    </div>
  </div>
</template>

<script setup>
import TemplateCard from './TemplateCard.vue';

defineProps({
  templates: Array
});

const emit = defineEmits(['edit', 'delete', 'toggle-status']);

const editTemplate = (template) => {
  emit('edit', template);
};

const deleteTemplate = (template) => {
  emit('delete', template);
};

const toggleStatus = (template) => {
  emit('toggle-status', template);
};
</script>

<style scoped>
.template-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-state p:first-child {
  font-size: 1.5rem;
  margin-bottom: 8px;
}

.hint {
  font-size: 0.9rem;
  color: #9ca3af;
}
</style>