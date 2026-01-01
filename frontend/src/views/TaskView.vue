<script setup>
  import { ref, onMounted } from 'vue';
  import { useTaskStore } from '@/stores/entities/taskStore';
  import TaskList from '@/components/tasks/TaskList.vue';
  import TaskForm from '@/components/tasks/TaskForm.vue';
  import TaskDeleteDialog from '@/components/tasks/TaskDeleteDialog.vue';
  
  const taskStore = useTaskStore();
  
  const activeModal = ref(null); // 'form' | 'delete' | null
  const selectedTask = ref(null);
  
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
    if (task.id) {
      await taskStore.editTask(task.id, task);
    } else {
      await taskStore.addTask(task);
    }
    closeModal();
  };
  
  const deleteTask = async () => {
    if (selectedTask.value) {
      await taskStore.removeTask(selectedTask.value.id);
      closeModal();
    }
  };
  </script>
  
  <template>
    <div>
      <button @click="openTaskForm">+ Neue Aufgabe</button>
      <TaskList
        :tasks="taskStore.tasks"
        @edit="openTaskForm"
        @delete="openDeleteDialog"
      />
      <TaskForm
        v-if="showTaskForm"
        :task="selectedTask"
        @save="saveTask"
        @close="() => (showTaskForm.value = false)"
      />
      <TaskDeleteDialog
        v-if="showDeleteDialog"
        @delete="deleteTask"
        @close="() => (showDeleteDialog.value = false)"
      />
    </div>
  </template>