<template>
  <div class="template-card">
    <div class="template-header">
      <h3>{{ template.name }}</h3>
      <div class="template-actions">
        <button @click="$emit('edit', template)" class="btn-icon" title="Bearbeiten">
          ✏️
        </button>
        <button @click="$emit('delete', template)" class="btn-icon btn-danger" title="Löschen">
          🗑️
        </button>
      </div>
    </div>
    
    <p class="template-description">{{ template.description || 'Keine Beschreibung' }}</p>
    
    <div class="template-defaults">
      <div class="default-item" v-if="template.default_title">
        <span class="label">Standard-Titel:</span>
        <span class="value">{{ template.default_title }}</span>
      </div>
      <div class="default-item" v-if="template.default_priority_id">
        <span class="label">Standard-Priorität:</span>
        <span class="value">{{ getPriorityName(template.default_priority_id) }}</span>
      </div>
      <div class="default-item" v-if="template.default_deadline_days">
        <span class="label">Standard-Deadline:</span>
        <span class="value">{{ template.default_deadline_days }} Tage</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  template: {
    type: Object,
    required: true
  }
});

defineEmits(['edit', 'delete']);

const getPriorityName = (id) => {
  const priorities = { 1: 'Niedrig', 2: 'Mittel', 3: 'Hoch', 4: 'Dringend' };
  return priorities[id] || 'Mittel';
};
</script>

<style scoped>
.template-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.template-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
}

.template-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: #f3f4f6;
}

.btn-icon.btn-danger:hover {
  background-color: #fee2e2;
}

.template-description {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 16px;
  line-height: 1.5;
}

.template-defaults {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.default-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.label {
  color: #6b7280;
}

.value {
  color: #1f2937;
  font-weight: 600;
}
</style>