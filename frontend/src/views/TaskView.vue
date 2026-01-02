<script setup>
import { ref, onMounted, computed } from 'vue';
import { useTaskStore } from '@/stores/entities/taskStore';
import { useTaskFilters } from '@/composables/useTaskFilters';
import TaskList from '@/components/tasks/TaskList.vue';
import TaskForm from '@/components/tasks/TaskForm.vue';
import TaskDeleteDialog from '@/components/tasks/TaskDeleteDialog.vue';
import TaskFilters from '@/components/tasks/TaskFilters.vue';

const taskStore = useTaskStore();

const activeModal = ref(null); // 'form' | 'delete' | null
const selectedTask = ref(null);

const searchQuery = ref('');
const filterStatus = ref('all');
const sortBy = ref('date');

const { filteredAndSorted: filteredAndSortedTasks } = useTaskFilters(
  computed(() => taskStore.tasks),
  searchQuery,
  filterStatus,
  sortBy
);

onMounted(async () => {
  await taskStore.getTasks();
});

const openTaskForm = (task = null) => {
  selectedTask.value = task;
  activeModal.value = 'form';
};

const openDeleteDialog = (task) => {
  selectedTask.value = task;
  activeModal.value = 'delete';
};

const closeModal = () => {
  activeModal.value = null;
  selectedTask.value = null;
};

const saveTask = async (task) => {
  if (task.task_id) {
    await taskStore.editTask(task.task_id, task);
  } else {
    await taskStore.addTask(task);
  }
  closeModal();
};

const deleteTask = async () => {
  if (selectedTask.value) {
    await taskStore.removeTask(selectedTask.value.task_id);
    closeModal();
  }
};

const toggleTaskStatus = async (task) => {
  const updatedTask = {
    ...task,
    status: task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED'
  };
  await taskStore.editTask(task.task_id, updatedTask);
};
</script>

<template>
  <div class="task-view">
    <div class="task-header">
      <h1>Meine Aufgaben</h1>
      <button @click="openTaskForm()" class="btn-primary">
        + Neue Aufgabe
      </button>
    </div>

    <TaskFilters v-model:searchQuery="searchQuery" v-model:filterStatus="filterStatus" v-model:sortBy="sortBy" />

    <TaskList :tasks="filteredAndSortedTasks" @edit="openTaskForm" @delete="openDeleteDialog"
      @toggle-status="toggleTaskStatus" />

    <TaskForm v-if="activeModal === 'form'" :task="selectedTask" @save="saveTask" @close="closeModal" />

    <TaskDeleteDialog v-if="activeModal === 'delete'" :task="selectedTask" @delete="deleteTask" @close="closeModal" />
  </div>
</template>

<style scoped>
.task-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.task-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 2rem;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
  background-color: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:focus {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}
</style>