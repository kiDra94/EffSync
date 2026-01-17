import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchTasks, fetchTaskById, createTask, updateTask, deleteTask, patchTask, updateCompletionRule } from '@/api/tasks';

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

    function evaluateCompletionRule(rule) {
        if (!rule) return null;

        if (rule.type === 'leaf') {
            const leaf = tasks.value.find(t => t.task_id === rule.task_id);
            return leaf ? leaf.status === 'COMPLETED' : false;
        }

        if (rule.type === 'operator') {
            const results = rule.operands.map(child =>
                evaluateCompletionRule(child)
            );

            switch (rule.operator) {
                case 'AND':
                    return results.every(r => r === true);
                case 'OR':
                    return results.some(r => r === true);
                case 'XOR':
                    return results.filter(r => r === true).length === 1;
                case 'NOT':
                    return !results[0];
                default:
                    return false;
            }
        }

        return false;
    }

    const isLogicFulfilled = computed(() => (taskId) => {
        const task = tasks.value.find(t => t.task_id === taskId);
        if (!task?.completion_rule) return null;
        const rule = typeof task.completion_rule === 'string' ? JSON.parse(task.completion_rule) : task.completion_rule;

        return evaluateCompletionRule(rule);
    });

    function ruleContainsTask(rule, taskId) {
        if (!rule) return false;
        if (rule.type === 'leaf') return rule.task_id === taskId;
        if (rule.type === 'operator') {
            return rule.operands.some(op => ruleContainsTask(op, taskId));
        }
        return false;
    }

    function findAffectedParents(childTaskId) {
        return tasks.value.filter(task => {
            if (!task.completion_rule) return false;
            const rule = typeof task.completion_rule === 'string' ? JSON.parse(task.completion_rule) : task.completion_rule;
            
            return ruleContainsTask(rule, childTaskId);
        });
    }

    async function changeStatus(task_id, newStatus) {
        try {
            const updates = { status: newStatus };
            if (newStatus === 'COMPLETED') {
                updates.progress = 100;
            }
            await patchTask(task_id, updates);
            const index = tasks.value.findIndex((t) => t.task_id === task_id);
            if (index !== -1) {
                tasks.value[index].status = newStatus;
                tasks.value[index].progress = updates.progress || tasks.value[index].progress;
            }
            await checkAffectedParents(task_id);
        } catch (error) {
            console.error('Fehler beim Statuswechsel:', error);
            throw error;
        }
    }

    async function checkAffectedParents(childTaskId) {
        const affectedParents = findAffectedParents(childTaskId);

        for (const parent of affectedParents) {
            const isFulfilled = isLogicFulfilled.value(parent.task_id);

            if (parent.auto_complete) {
                if (isFulfilled && parent.status !== 'COMPLETED') {
                    await changeStatus(parent.task_id, 'COMPLETED');
                } else if (!isFulfilled && parent.status === 'COMPLETED') {
                    await changeStatus(parent.task_id, 'IN_PROGRESS');
                }
            }
        }
    }

    async function saveCompletionRule(taskId, rule, autoComplete = false) {
        try {
            const ruleJson = typeof rule === 'object' ? JSON.stringify(rule) : rule;
            await updateCompletionRule(taskId, ruleJson, autoComplete);
            
            const index = tasks.value.findIndex(t => t.task_id === taskId);
            if (index !== -1) {
                tasks.value[index].completion_rule = ruleJson;
                tasks.value[index].auto_complete = autoComplete;
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Completion Rule:', error);
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
        isLogicFulfilled,
        evaluateCompletionRule,
        saveCompletionRule,
        checkAffectedParents
    };
});