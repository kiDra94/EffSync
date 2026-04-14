import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchTasks, fetchTaskById, createTask, updateTask, deleteTask, patchTask, updateCompletionRule } from '@/api/tasks';
import { useSocket } from '../useSocket';

let isSaving = false;

export const useTaskStore = defineStore('task', () => {
    const tasks = ref([]);
    const { socket_on, socket_off } = useSocket();

    function buildSubtaskPayload(subtask, parentTaskId, parentTaskData = {}) {
        return {
            ...subtask,
            parent_task_id: parentTaskId,
            deadline: subtask.deadline || parentTaskData.deadline,
            description: subtask.description ?? parentTaskData.description ?? '',
            status: subtask.status || parentTaskData.status || 'TODO',
            progress: subtask.progress ?? 0,
            priority_id: subtask.priority_id || parentTaskData.priority_id || 2,
        };
    }

    function parseCompletionRule(rule) {
        if (!rule) return null;
        if (typeof rule === 'string') {
            try {
                return JSON.parse(rule);
            } catch (error) {
                console.error('Fehler beim Parsen der completion_rule:', error);
                return null;
            }
        }
        return rule;
    }

    function normalizeCompletionRule(rule) {
        const parsedRule = parseCompletionRule(rule);
        if (!parsedRule) return null;

        const normalizeNode = (node) => {
            if (!node || typeof node !== 'object') return node;

            if (node.type === 'leaf') {
                return {
                    type: 'leaf',
                    task_id: node.task_id != null ? String(node.task_id) : node.task_id,
                };
            }

            if (node.type === 'operator') {
                return {
                    type: 'operator',
                    operator: node.operator,
                    operands: Array.isArray(node.operands)
                        ? node.operands.map((operand) => normalizeNode(operand))
                        : [],
                };
            }

            return node;
        };

        return normalizeNode(parsedRule);
    }

    function evaluateCompletionRule(rule) {
        const parsedRule = parseCompletionRule(rule);
        if (!parsedRule) return false;

        if (parsedRule.type === 'leaf') {
            const task = tasks.value.find(t => String(t.task_id) === String(parsedRule.task_id));
            return task?.status === 'COMPLETED';
        }

        if (parsedRule.type === 'operator') {
            const operands = Array.isArray(parsedRule.operands) ? parsedRule.operands : [];
            const results = operands.map(operand => evaluateCompletionRule(operand));

            switch (parsedRule.operator) {
                case 'AND':
                    return results.length > 0 && results.every(Boolean);
                case 'OR':
                    return results.some(Boolean);
                case 'XOR':
                    return results.filter(Boolean).length === 1;
                case 'NOT':
                    return results.length > 0 ? !results[0] : true;
                default:
                    return false;
            }
        }

        return false;
    }

    function isLogicFulfilled(taskId) {
        const task = tasks.value.find(t => String(t.task_id) === String(taskId));
        if (!task?.completion_rule) return null;
        return evaluateCompletionRule(task.completion_rule);
    }

    async function updateTaskStatusSilently(taskId, newStatus) {
        const index = tasks.value.findIndex(t => String(t.task_id) === String(taskId));
        if (index === -1) return;

        const updates = { status: newStatus };
        if (newStatus === 'COMPLETED') {
            updates.progress = 100;
        } else if (tasks.value[index].progress === 100) {
            updates.progress = 0;
        }

        tasks.value[index] = {
            ...tasks.value[index],
            ...updates,
        };

        await patchTask(taskId, updates);
    }

    async function checkAffectedParents(changedTaskId, visited = new Set()) {
        const normalizedChangedId = String(changedTaskId);
        if (visited.has(normalizedChangedId)) return;
        visited.add(normalizedChangedId);

        const affectedParents = tasks.value.filter(task => {
            const rule = parseCompletionRule(task.completion_rule);
            if (!task.auto_complete || !rule) return false;

            const serializedRule = JSON.stringify(rule);
            return serializedRule.includes(`"task_id":"${normalizedChangedId}"`)
                || serializedRule.includes(`"task_id":${normalizedChangedId}`);
        });

        for (const parent of affectedParents) {
            const fulfilled = isLogicFulfilled(parent.task_id);

            if (fulfilled && parent.status !== 'COMPLETED') {
                await updateTaskStatusSilently(parent.task_id, 'COMPLETED');
                await checkAffectedParents(parent.task_id, visited);
            } else if (fulfilled === false && parent.status === 'COMPLETED') {
                await updateTaskStatusSilently(parent.task_id, 'IN_PROGRESS');
                await checkAffectedParents(parent.task_id, visited);
            }
        }
    }

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
            console.log('🔧 [taskStore] editTask aufgerufen mit task_id:', task_id, 'task:', task);
            const updatedTask = await updateTask(task_id, task);
            console.log('✅ [taskStore] Task aktualisiert vom Backend:', updatedTask);
            const index = tasks.value.findIndex((i) => i.task_id === task_id);
            if (index !== -1) {
                tasks.value[index] = updatedTask.data || updatedTask;
            }
        } catch (error) {
            console.error('❌ [taskStore] Fehler beim Bearbeiten eines Tasks:', error);
            console.error('📋 Backend-Status:', error?.response?.status);
            console.error('📋 Backend-Fehler:', error?.response?.data);
            throw error;
        }
    }

    async function removeTask(task_id) {
        try {
            const normalizedTaskId = String(task_id);

            // Erst alle direkten Subtasks rekursiv löschen,
            // da das Backend Parent-Tasks mit Subtasks blockiert.
            const directSubtasks = tasks.value.filter(
                (task) => String(task.parent_task_id) === normalizedTaskId
            );

            for (const subtask of directSubtasks) {
                await removeTask(subtask.task_id);
            }

            await deleteTask(task_id);
            tasks.value = tasks.value.filter(
                (task) => String(task.task_id) !== normalizedTaskId
            );
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
            await checkAffectedParents(task_id);
        } catch (error) {
            console.error('Fehler beim Statuswechsel:', error);
            throw error;
        }
    }

    async function saveCompletionRule(taskId, rule, autoComplete = false) {
        if (isSaving) return;
        isSaving = true;
        try {
            const normalizedRule = normalizeCompletionRule(rule);
            await updateCompletionRule(taskId, normalizedRule, autoComplete);

            const index = tasks.value.findIndex(t => t.task_id === taskId);
            if (index !== -1) {
                tasks.value[index].completion_rule = normalizedRule;
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
                    const subtaskData = buildSubtaskPayload(subtask, createdParent.task_id, taskData);
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
                    const subtaskData = buildSubtaskPayload(subtask, task_id, taskData);
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
        evaluateCompletionRule,
        isLogicFulfilled,
        checkAffectedParents,
        saveCompletionRule,
        createTaskWithSubtasks,
        editTaskWithSubtasks,
    };
});