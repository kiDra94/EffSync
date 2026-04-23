<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTaskStore } from '@/stores/entities/taskStore';
import { useAuthStore } from '@/stores/authStore';
import { useTaskFilters } from '@/composables/useTaskFilters';
import TaskList from '@/components/tasks/TaskList.vue';
import TaskForm from '@/components/tasks/TaskForm.vue';
import TaskDeleteDialog from '@/components/tasks/TaskDeleteDialog.vue';
import TaskFilters from '@/components/tasks/TaskFilters.vue';
import RuleBuilder from '@/components/tasks/RuleBuilder.vue';
import GradeModal from '@/components/tasks/GradeModal.vue';
import { taskMembersApi } from '@/api/taskMembers';

const route = useRoute();
const taskStore = useTaskStore();
const authStore = useAuthStore();

// Bestimme ob User ein Lehrer ist
const isTeacher = computed(() => {
  const roles = ['teacher', 'admin', 'superuser'];
  return roles.includes((authStore.userRole || '').toLowerCase());
});

const activeModal = ref(null);
const selectedTask = ref(null);
const showRulePrompt = ref(false);
const newlyCreatedTask = ref(null);

const searchQuery = ref('');
const filterStatus = ref('all');
const sortBy = ref('date');

const { filteredAndSorted: filteredAndSortedTasks } = useTaskFilters(
  computed(() => taskStore.tasks),
  searchQuery,
  filterStatus,
  sortBy
);

const subtasksForRuleBuilder = computed(() => {
  if (!selectedTask.value) return [];

  const parentId = selectedTask.value.task_id || selectedTask.value.id;

  return taskStore.tasks.filter(t => t.parent_task_id === parentId);
});

onMounted(async () => {
  await taskStore.getTasks();
  applyStatusFilter();
});

// Watcher für URL-Änderungen
watch(() => route.query.status, () => {
  applyStatusFilter();
});

const applyStatusFilter = () => {
  const statusParam = route.query.status;
  if (statusParam) {
    filterStatus.value = statusParam;
  } else {
    filterStatus.value = 'all';
  }
};

const openTaskForm = (task = null) => {
  selectedTask.value = task;
  activeModal.value = 'form';
};

const openDeleteDialog = (task) => {
  selectedTask.value = task;
  activeModal.value = 'delete';
};

const openRuleBuilder = (task) => {
  selectedTask.value = task;
  activeModal.value = 'rule';
  showRulePrompt.value = false;
};

const openGradeModal = (task) => {
  selectedTask.value = task;
  activeModal.value = 'grade';
};

const closeModal = () => {
  activeModal.value = null;
  selectedTask.value = null;
  showRulePrompt.value = false;
  newlyCreatedTask.value = null;
};

const saveTask = async (task) => {
  try {
    console.log('💾 [TaskView] Speichere Task:', task);
    const { member_user_ids, ...taskPayload } = task;
    const pendingMemberIds = Array.isArray(member_user_ids)
      ? [...new Set(member_user_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
      : [];

    const taskId = taskPayload.task_id || taskPayload.id;
    if (taskId) {
      console.log('✏️ Editiere Task:', taskId);
      await taskStore.editTask(taskId, taskPayload);
    } else {
      console.log('✨ Erstelle neuen Task');
      const createdTask = await taskStore.addTask(taskPayload);
      const createdTaskId = createdTask?.task_id || createdTask?.id;

      if (createdTaskId && pendingMemberIds.length > 0) {
        await Promise.allSettled(
          pendingMemberIds.map((userId) =>
            taskMembersApi.addTaskMember(createdTaskId, { user_id: userId })
          ),
        );
      }
    }
    console.log('✅ Task erfolgreich gespeichert!');
    closeModal();
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Tasks:', error);
    const errorMessage = error?.response?.data?.message || error?.response?.statusText || error?.message || 'Unbekannter Fehler';
    const errorDetails = error?.response?.data;
    console.error('📋 Backend-Fehler Details:', errorDetails);
    alert(`Fehler beim Speichern: ${errorMessage}`);
  }
};

const saveTaskWithSubtasks = async ({ taskData, subtasks }) => {
  try {
    console.log('💾 [TaskView] Speichere Task mit Subtasks:', { taskData, subtasks });
    const { member_user_ids, ...taskPayload } = taskData;
    const pendingMemberIds = Array.isArray(member_user_ids)
      ? [...new Set(member_user_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
      : [];

    const taskId = taskPayload.task_id || taskPayload.id;
    if (taskId) {
      console.log('✏️ Editiere Task mit Subtasks:', taskId);
      await taskStore.editTaskWithSubtasks(taskId, taskPayload, subtasks);
      closeModal();
    } else {
      console.log('✨ Erstelle neuen Task mit Subtasks');
      const result = await taskStore.createTaskWithSubtasks(taskPayload, subtasks);

      const createdTaskId = result?.parentTask?.task_id || result?.parentTask?.id;
      if (createdTaskId && pendingMemberIds.length > 0) {
        await Promise.allSettled(
          pendingMemberIds.map((userId) =>
            taskMembersApi.addTaskMember(createdTaskId, { user_id: userId })
          ),
        );
      }

      closeModal();

      if (subtasks.length > 0) {
        newlyCreatedTask.value = result.parentTask;
        showRulePrompt.value = true;
      }
    }
    console.log('✅ Task mit Subtasks erfolgreich gespeichert!');
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Tasks mit Subtasks:', error);
    const errorMessage = error?.response?.data?.message || error?.response?.statusText || error?.message || 'Unbekannter Fehler';
    const errorDetails = error?.response?.data;
    console.error('📋 Backend-Fehler Details:', errorDetails);
    alert(`Fehler beim Speichern: ${errorMessage}`);
  }
};

const handleRulePromptYes = () => {
  if (!newlyCreatedTask.value) return;

  const targetId = newlyCreatedTask.value.task_id || newlyCreatedTask.value.id;
  const realStoreTask = taskStore.tasks.find(t => (t.task_id || t.id) === targetId);

  if (realStoreTask) {
    selectedTask.value = realStoreTask;
  } else {
    // Fallback
    selectedTask.value = newlyCreatedTask.value;
  }

  activeModal.value = 'rule';
  showRulePrompt.value = false;
};

const handleRulePromptNo = () => {
  showRulePrompt.value = false;
  newlyCreatedTask.value = null;
};

const handleGradeSaved = () => {
  // Optionally refresh tasks or show notification
  console.log('Bewertung gespeichert');
};

const deleteTask = async () => {
  if (!selectedTask.value) return;

  try {
    const taskId = selectedTask.value.task_id || selectedTask.value.id;
    await taskStore.removeTask(taskId);
    closeModal();
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Tasks:', error);
    const errorMessage = error?.response?.data?.message || error?.response?.statusText || error?.message || 'Unbekannter Fehler';
    alert(`Fehler beim Löschen: ${errorMessage}`);
  }
};

const toggleTaskStatus = async (task) => {
  const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
  const taskId = task.task_id || task.id;
  await taskStore.changeStatus(taskId, newStatus);
};

const handleStatusChange = async (task, newStatus) => {
  const taskId = task.task_id || task.id;
  await taskStore.changeStatus(taskId, newStatus);
};

const saveRule = async ({ rule, autoComplete }) => {
  if (!selectedTask.value) return;

  try {
    const taskId = selectedTask.value.task_id || selectedTask.value.id;
    await taskStore.saveCompletionRule(taskId, rule, autoComplete);
    closeModal();
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Verknüpfungslogik:', error);
    const errorMessage = error?.response?.data?.message || error?.response?.statusText || error?.message || 'Unbekannter Fehler';
    alert(`Fehler beim Speichern der Verknüpfungslogik: ${errorMessage}`);
  }
};
</script>

<template>
  <div class="task-view">
    <div class="task-header">
      <div v-if="isTeacher" class="header-content">
        <h1>📝 Taskliste</h1>
        <p class="header-subtitle">Schüler-Submitals überprüfen und bewerten</p>
      </div>
      <div v-else class="header-content">
        <h1>📋 Meine Aufgaben</h1>
        <p class="header-subtitle">Deine persönlichen Tasks verwalten</p>
      </div>

      <button @click="openTaskForm()" class="btn-primary">
        + Neue Aufgabe
      </button>
    </div>

    <TaskFilters v-model:searchQuery="searchQuery" v-model:filterStatus="filterStatus" v-model:sortBy="sortBy" />

    <TaskList :tasks="filteredAndSortedTasks" @edit="openTaskForm" @delete="openDeleteDialog"
      @toggle-status="toggleTaskStatus" @change-status="handleStatusChange" @edit-rule="openRuleBuilder" @grade="openGradeModal" />

    <TaskForm v-if="activeModal === 'form'" :task="selectedTask" @save="saveTask"
      @save-with-subtasks="saveTaskWithSubtasks" @close="closeModal" />

    <TaskDeleteDialog v-if="activeModal === 'delete'" :task="selectedTask" @delete="deleteTask" @close="closeModal" />

    <div v-if="activeModal === 'rule'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <RuleBuilder :task-id="selectedTask.task_id || selectedTask.id" :initial-rule="selectedTask.completion_rule"
          :initial-auto-complete="selectedTask.auto_complete" :subtasks="subtasksForRuleBuilder" @save="saveRule"
          @close="closeModal" />
      </div>
    </div>

    <GradeModal v-if="activeModal === 'grade'" :task="selectedTask" @close="closeModal" @saved="handleGradeSaved" />

    <div v-if="showRulePrompt" class="modal-overlay" @click.self="handleRulePromptNo">
      <div class="prompt-modal">
        <div class="prompt-icon">🔗</div>
        <h3>Subtasks erstellt!</h3>
        <p>Möchtest du jetzt eine Abschlussbedingung für diesen Task definieren?</p>
        <div class="prompt-actions">
          <button @click="handleRulePromptNo" class="btn-secondary">
            Nein, später
          </button>
          <button @click="handleRulePromptYes" class="btn-primary">
            Ja, Regel erstellen
          </button>
        </div>
      </div>
    </div>
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

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.prompt-modal {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.prompt-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.prompt-modal h3 {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1.5rem;
}

.prompt-modal p {
  margin: 0 0 2rem 0;
  color: #6b7280;
  font-size: 1rem;
}

.prompt-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
</style>