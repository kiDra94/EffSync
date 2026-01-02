import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchTasks, fetchTaskById, createTask, updateTask, deleteTask, updateTaskStatus } from '@/api/tasks';

export const useTaskStore = defineStore('task', () => {
    const tasks = ref([]);

    async function getTasks() {
        try {
            const response = await fetchTasks();
            tasks.value = response.data || response;
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

    async function changeStatus(task_id, newStatus) {
        try {
            await updateTaskStatus(task_id, newStatus);
            const index = tasks.value.findIndex((t) => t.task_id === task_id);
            if (index !== -1) {
                tasks.value[index].status = newStatus;
            }
        } catch (error) {
            console.error('Fehler beim Statuswechsel:', error);
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

    return {
        tasks,
        getTasks,
        getTaskById,
        addTask,
        editTask,
        changeStatus,
        removeTask,
    };
});