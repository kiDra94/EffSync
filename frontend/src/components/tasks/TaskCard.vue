<template>
  <div class="task-card" :class="{ 'is-done': task.status === 'COMPLETED' }">

    <div class="priority-indicator"
      :style="{ background: task.status === 'COMPLETED' ? 'linear-gradient(to bottom, #9ca3af 0%, #e5e7eb 100%)' : getPriorityGradient(task.priority_id) }">
    </div>

    <div class="task-left">
      <input type="checkbox" :checked="task.status === 'COMPLETED'" class="task-checkbox" @change="toggleStatus"
        :aria-label="`Task ${task.title} markieren`" />
    </div>

    <div class="task-content">
      <div class="task-header">

        <div class="status-select-wrapper">
          <select :value="task.status" @change="onStatusChange" class="status-select" :style="{
            color: getStatusColor(task.status),
            borderColor: getStatusColor(task.status),
            backgroundColor: getStatusColor(task.status) + '15'
          }" @click.stop>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Arbeit</option>
            <option value="IN_REVIEW">Review</option>
            <option value="ON_HOLD">Pausiert</option>
            <option value="COMPLETED">Fertig</option>
          </select>
        </div>

        <span class="priority-badge" :style="{ backgroundColor: getPriorityColor(task.priority_id) }">
          {{ getPriorityLabel(task.priority_id) }}
        </span>
        <span class="date-badge" :style="{ color: task.status === 'COMPLETED' ? '#aaa' : '#555' }">
          📅 {{ formatDate(task.deadline) }}
        </span>
        <span v-if="task.progress !== undefined" class="progress-badge">
          📊 {{ task.progress }}%
        </span>
      </div>
      <h3 class="task-title">{{ task.title }}</h3>
    </div>

    <div class="task-right">
      <button v-if="!task.parent_task_id" @click="$emit('edit-rule', task)" class="task-btn"
        title="Regel bearbeiten">⚙️</button>
      <button @click="editTask" class="task-btn" title="Bearbeiten">✏️</button>
      <button @click="deleteTask" class="task-btn task-btn-delete" title="Löschen">🗑️</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTaskStore } from '@/stores/entities/taskStore';
import RuleVisualizer from './RuleVisualizer.vue';

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['edit', 'delete', 'toggleStatus', 'change-status', 'edit-rule']);

const taskStore = useTaskStore();
const subtasks = computed(() => taskStore.getSubtasks(props.task.task_id));
const allTasks = computed(() => taskStore.tasks);

const editTask = () => {
  emit('edit', props.task);
};

const deleteTask = () => {
  emit('delete', props.task);
};

const toggleStatus = () => {
  emit('toggleStatus', props.task);
};

const onStatusChange = (event) => {
  emit('change-status', props.task, event.target.value);
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
    1: '#27ae60', // niedrig (Grün)
    2: '#f39c12', // mittel (Gelb/Orange)
    3: '#e74c3c', // hoch (Rot)
    4: '#c0392b'  // dringend (Dunkelrot)
  };
  return colors[prio_id] || '#6b7280';
};

const getPriorityGradient = (prio_id) => {
  const gradients = {
    1: 'linear-gradient(to bottom, #15803d 0%, #27ae60 100%)', // Dark Green -> Light Green
    2: 'linear-gradient(to bottom, #a16207 0%, #f39c12 100%)', // Dark Gold -> Yellow
    3: 'linear-gradient(to bottom, #b91c1c 0%, #e74c3c 100%)', // Dark Red -> Light Red
    4: 'linear-gradient(to bottom, #450a0a 0%, #c0392b 100%)'  // Very Dark Red -> Red
  };
  return gradients[prio_id] || 'linear-gradient(to bottom, #4b5563 0%, #d1d5db 100%)';
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
.task-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  padding-left: 35px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-start;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;

  position: relative;
  overflow: hidden;
}

.priority-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 18px;
  z-index: 1;
}

.task-card:hover {
  transform: translateX(3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-card.is-done {
  background-color: #f9fafb;
  box-shadow: none;
}

.task-card.is-done .task-title {
  text-decoration: line-through;
  color: #888;
}

.task-left {
  display: flex;
  align-items: center;
  padding-top: 4px;
}

.task-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #4f46e5;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  margin-bottom: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.status-select {
  appearance: none;
  border: 1px solid;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  text-align: center;
  background-color: transparent;
}

.status-select:hover {
  opacity: 0.8;
}

.priority-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  color: white;
}

.date-badge,
.progress-badge {
  font-size: 0.75rem;
  white-space: nowrap;
  color: #6b7280;
}

.task-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.task-right {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex-shrink: 0;
  padding-top: 4px;
  z-index: 2;
}

.task-btn {
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

.task-btn:hover {
  background-color: #f0f0f0;
}

.task-btn-delete:hover {
  background-color: #fee2e2;
  color: #ef4444;
}
</style>