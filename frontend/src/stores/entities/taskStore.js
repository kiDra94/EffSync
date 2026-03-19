import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchTasks, fetchTaskById, createTask, updateTask, deleteTask, patchTask, updateCompletionRule } from '@/api/tasks';
import { useSocket } from '../useSocket';

let isSaving = false;

export const useTaskStore = defineStore('task', () => {
    const tasks = ref([]);
    const { socket_on, socket_off } = useSocket();

    function initSocketListeners() {
        //if(!socket.value) return;
        socket_off('task:updated');

        socket_on('task:updated', (updatedTask) => {
            const index = tasks.value.findIndex(task => task.task_id === updatedTask.task_id);
            if(index !== -1) { // findIndex gibt -1 zurueck wenn es nix findet!
                tasks.value[index] = updatedTask;
                console.log(`Task ${updatedTask.title} was updated automatically!`)
            }
        })
    }

    async function getTasks() {
        try {
            const response = await fetchTasks();
            tasks.value = response.data || response;
            initSocketListeners();
        } catch (error) {
            console.error('Fehler beim Abrufen der Tasks:', error);
            throw error;
        }
    }

    async function getTaskById(task_id) {
        try {
            const response = await fetchTaskById(task_id);
            return response.data || response
        } catch (error) {
            console.error('Fehler beim Abrufen des Task:', error);
            throw error;
        }
    }

    async function addTask(task) {
        try {
            const newTask = await createTask(task);
            tasks.value.push(newTask.data || newTask);
        } catch (error) {
            console.error('Fehler beim Hinzufügen eines Tasks:', error);
            throw error;
        }
    }

    async function editTask(task_id, task) {
        try {
            const updatedTask = await updateTask(task_id, task);
            const index = tasks.value.findIndex((i) => i.task_id === task_id);
            if (index !== -1) {
                tasks.value[index] = updatedTask.data || updatedTask;
            }
        } catch (error) {
            console.error('Fehler beim Bearbeiten eines Tasks:', error);
            throw error;
        }
    }

    async function removeTask(task_id) {
        try {
            await deleteTask(task_id);
            tasks.value = tasks.value.filter((task) => task.task_id !== task_id);
        } catch (error) {
            console.error('Fehler beim Löschen eines Tasks:', error);
            throw error;
        }
    }

    const getSubtasks = computed(() => (taskId) => {
        return tasks.value.filter(task => task.parent_task_id === taskId);
    });

    async function changeStatus(task_id, newStatus) {
        try {
            const updates = { status: newStatus };
            if (newStatus === 'COMPLETED') {
                updates.progress = 100;
            }
            const index = tasks.value.findIndex((t) => t.task_id === task_id);
            if (index !== -1) {
                tasks.value[index].status = newStatus;
                tasks.value[index].progress = updates.progress || tasks.value[index].progress;
            }
            await patchTask(task_id, updates);
        } catch (error) {
            console.error('Fehler beim Statuswechsel:', error);
            throw error;
        }
    }

    async function saveCompletionRule(taskId, rule, autoComplete = false) {
        if (isSaving) return;
        isSaving = true;
        try {
            // const ruleJson = typeof rule === 'object' ? JSON.stringify(rule) : rule;
            await updateCompletionRule(taskId, rule, autoComplete);

            const index = tasks.value.findIndex(t => t.task_id === taskId);
            if (index !== -1) {
                tasks.value[index].completion_rule = rule;
                tasks.value[index].auto_complete = autoComplete;
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Completion Rule:', error);
            throw error;
        } finally {
            isSaving = false;
        }
    }

    async function createTaskWithSubtasks(taskData, subtasks) {
        try {
            const parentTask = await createTask(taskData);
            const createdParent = parentTask.data || parentTask;
            tasks.value.push(createdParent);

            const createdSubtasks = [];
            for (const subtask of subtasks) {
                if (subtask.title && subtask.title.trim()) {
                    const subtaskData = {
                        ...subtask,
                        parent_task_id: createdParent.task_id
                    };
                    const newSubtask = await createTask(subtaskData);
                    const createdSub = newSubtask.data || newSubtask;
                    tasks.value.push(createdSub);
                    createdSubtasks.push(createdSub);
                }
            }

            return {
                parentTask: createdParent,
                subtasks: createdSubtasks
            };
        } catch (error) {
            console.error('Fehler beim Erstellen von Task mit Subtasks:', error);
            throw error;
        }
    }

    async function editTaskWithSubtasks(task_id, taskData, subtasks) {
        try {
            await editTask(task_id, taskData);

            const existingSubtasks = getSubtasks.value(task_id);
            const existingIds = existingSubtasks.map(st => st.task_id);
            const incomingIds = subtasks.filter(st => st.task_id).map(st => st.task_id);

            for (const id of existingIds) {
                if (!incomingIds.includes(id)) {
                    await removeTask(id);
                }
            }

            const updatedSubtasks = [];
            for (const subtask of subtasks) {
                if (subtask.task_id) {
                    // Bestehenden Subtask aktualisieren
                    await editTask(subtask.task_id, subtask);
                    updatedSubtasks.push(subtask);
                } else if (subtask.title && subtask.title.trim()) {
                    // Neuen Subtask erstellen
                    const subtaskData = {
                        ...subtask,
                        parent_task_id: task_id
                    };
                    const newSubtask = await createTask(subtaskData);
                    const createdSub = newSubtask.data || newSubtask;
                    tasks.value.push(createdSub);
                    updatedSubtasks.push(createdSub);
                }
            }

            return {
                parentTask: tasks.value.find(t => t.task_id === task_id),
                subtasks: updatedSubtasks
            };
        } catch (error) {
            console.error('Fehler beim Bearbeiten von Task mit Subtasks:', error);
            throw error;
        }
    }

    return {
        tasks,
        getTasks,
        getTaskById,
        addTask,
        editTask,
        changeStatus,
        removeTask,
        getSubtasks,
        saveCompletionRule,
        createTaskWithSubtasks,
        editTaskWithSubtasks,
    };
});