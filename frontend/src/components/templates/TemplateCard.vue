<template>
  <div class="template-card" :class="{ 'is-done': template.status === 'COMPLETED' }">
    <div class="template-left">
      <input type="checkbox" :checked="template.status === 'COMPLETED'" class="template-checkbox" @change="toggleStatus"
        :aria-label="`Task ${template.title} markieren`" />
    </div>
    <div class="template-content">
      <div class="template-header">
        <span class="status-badge" :style="{
          backgroundColor: getStatusColor(template.status) + '20',
          color: getStatusColor(template.status),
          border: `1px solid ${getStatusColor(template.status)}`
        }">
          {{ formatStatusLabel(template.status) }}
        </span>
        <span class="priority-badge" :style="{ backgroundColor: getPriorityColor(template.priority_id) }">
          {{ getPriorityLabel(template.priority_id) }}
        </span>
        <span class="date-badge" :style="{ color: template.status === 'COMPLETED' ? '#aaa' : '#555' }">
          📅 {{ formatDate(template.deadline) }}
        </span>
        <span v-if="template.progress !== undefined" class="progress-badge">
          📊 {{ template.progress }}%
        </span>
      </div>
      <h3 class="template-title">{{ template.title }}</h3>
    </div>
    <div class="template-right">
      <div class="prio-dot" :style="{ backgroundColor: getPriorityColor(template.priority) }" title="Priorität"></div>
      <button @click="editTemplate">✏️</button>
      <button @click="deleteTemplate">🗑️</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  template: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['edit', 'delete', 'toggleStatus']);

const editTemplate = () => {
  emit('edit', props.template);
};

const deleteTemplate = () => {
  emit('delete', props.template);
};

const toggleStatus = () => {
  emit('toggleStatus', props.template);
};

const formatStatusLabel = (status) => {
  if (!status) return '';
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

const getStatusColor = (status) => {
  const colors = {
    TODO: '#6b7280',
    IN_PROGRESS: '#3b82f6',
    IN_REVIEW: '#f59e0b',
    ON_HOLD: '#ef4444',
    COMPLETED: '#10b981'
  };
  return colors[status] || '#6b7280';
};

const getPriorityColor = (prio_id) => {
  const colors = {
    1: '#27ae60', // niedrig
    2: '#f39c12', // mittel
    3: '#e74c3c', // hoch
    4: '#c0392b'  // dringend
  };
  return colors[prio_id] || '#6b7280';
};

const getPriorityLabel = (priorityId) => {
  const labels = {
    1: 'Niedrig',
    2: 'Mittel',
    3: 'Hoch',
    4: 'Dringend'
  };
  return labels[priorityId] || '';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>


<style scoped>
/* Styles aus der TaskView für die TaskCard */
.template-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-start;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
  border-left: 5px solid transparent;
}

.template-card:hover {
  transform: translateX(3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-card.is-done {
  background-color: #f0f0f0;
  box-shadow: none;
}

.template-card.is-done .template-title {
  text-decoration: line-through;
  color: #888;
}

.template-left {
  display: flex;
  align-items: center;
  padding-top: 4px;
}

.template-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #4f46e5;
}

.template-content {
  flex: 1;
  min-width: 0;
}

.template-header {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  margin-bottom: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.status-badge,
.priority-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.priority-badge {
  color: white;
}

.date-badge,
.progress-badge {
  font-size: 0.75rem;
  white-space: nowrap;
  color: #6b7280;
}

.template-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.template-description {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.template-right {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex-shrink: 0;
  padding-top: 4px;
}

.template-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  min-height: 38px;
}

.template-btn:hover {
  background-color: #f0f0f0;
}

.template-btn:focus {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}

.template-btn:active {
  transform: scale(0.95);
}

.template-btn-delete:hover {
  background-color: #fee;
  color: #e74c3c;
}
</style>