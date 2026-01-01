<template>
    <div class="task-card" :class="{ 'is-done': task.status === 'done' }">
      <div class="task-left">
        <input
          type="checkbox"
          :checked="task.status === 'done'"
          class="task-checkbox"
          @change="toggleStatus"
        />
      </div>
      <div class="task-content">
        <div class="task-header">
          <span class="subject-badge">{{ task.subject }}</span>
          <span class="date-badge" :style="{ color: task.status === 'done' ? '#aaa' : '#555' }">
            📅 {{ task.dueDate }}
          </span>
        </div>
        <h3 class="task-title">{{ task.title }}</h3>
      </div>
      <div class="task-right">
        <div class="prio-dot" :style="{ backgroundColor: getPriorityColor(task.priority) }" title="Priorität"></div>
        <button @click="editTask">✏️</button>
        <button @click="deleteTask">🗑️</button>
      </div>
    </div>
  </template>
  
  <script setup>
    const props = defineProps({
      task: Object,
    });
    
    const emit = defineEmits(['edit', 'delete', 'toggleStatus']);
    
    const editTask = () => {
      emit('edit', props.task);
    };
    
    const deleteTask = () => {
      emit('delete', props.task);
    };
    
    const toggleStatus = () => {
      emit('toggleStatus', props.task);
    };
    
    const getPriorityColor = (prio) => {
      if (prio === 'high') return '#e74c3c';
      if (prio === 'medium') return '#f39c12';
      return '#27ae60';
    };
    </script>
    
  
  <style scoped>
  /* Styles aus der TaskView für die TaskCard */
  .task-card {
    background: white;
    border-radius: 12px;
    padding: 15px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 15px;
    transition: transform 0.2s;
    border-left: 5px solid transparent;
  }
  
  .task-card:hover {
    transform: translateX(3px);
  }
  
  .task-card.is-done {
    background-color: #f0f0f0;
    box-shadow: none;
  }
  
  .task-card.is-done .task-title {
    text-decoration: line-through;
    color: #888;
  }
  
  .task-checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
  
  .task-content {
    flex: 1;
  }
  
  .task-header {
    display: flex;
    gap: 10px;
    font-size: 0.8rem;
    margin-bottom: 4px;
  }
  
  .subject-badge {
    background-color: #eef2ff;
    color: #4f46e5;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: bold;
  }
  
  .task-title {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
  }
  
  .prio-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  </style>