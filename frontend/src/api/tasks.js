import { apiClient } from '@/api/httpClient';
import {
    normalizeEntity,
    normalizeEntities,
    serializeEntity
} from '@/config/api.config'

const ENDPOINT = '/tasks';
const ID_KEY = 'task_id';

const ALLOWED_TASK_FIELDS = new Set([
    'title',
    'description',
    'status',
    'progress',
    'deadline',
    'created_by',
    'assigned_to',
    'parent_task_id',
    'priority_id',
    'auto_complete',
    'completion_rule',
]);

const sanitizeTaskPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return payload;
    return Object.fromEntries(
        Object.entries(payload).filter(([key]) => ALLOWED_TASK_FIELDS.has(key))
    );
};

// the list is paged (decision B3, M17); the store holds all of a user's tasks
const PAGE_SIZE = 100;

export const fetchTasks = async () => {
    const tasks = [];
    for (let page = 1; ; page++) {
        const response = await apiClient.get(ENDPOINT, {
            params: { includeRelations: true, page, limit: PAGE_SIZE },
        });
        const body = response.data;
        tasks.push(...(body?.data ?? body ?? []));
        const totalPages = body?.meta?.totalPages ?? 1;
        if (!Array.isArray(body?.data) || page >= totalPages) break;
    }
    return normalizeEntities(tasks, ID_KEY);
};

export const fetchTaskById = async (task_id) => {
    const response = await apiClient.get(`${ENDPOINT}/${task_id}`);
    return normalizeEntity(response.data, ID_KEY);
};

export const createTask = async (taskData) => {
    const sanitized = sanitizeTaskPayload(taskData);
    const response = await apiClient.post(ENDPOINT, serializeEntity(sanitized, ID_KEY));
    return normalizeEntity(response.data, ID_KEY);
};

export const updateTask = async (task_id, taskData) => {
    const sanitized = sanitizeTaskPayload(taskData);
    const serializedData = serializeEntity(sanitized, ID_KEY);
    console.log('📤 [updateTask API] Task-ID:', task_id);
    console.log('📤 [updateTask API] Original Daten:', taskData);
    console.log('📤 [updateTask API] Bereinigte Daten:', sanitized);
    console.log('📤 [updateTask API] Serialisierte Daten:', serializedData);
    try {
        const response = await apiClient.patch(`${ENDPOINT}/${task_id}`, serializedData);
        console.log('✅ [updateTask API] Backend antwortet mit Status:', response.status);
        console.log('✅ [updateTask API] Response-Daten:', response.data);
        return normalizeEntity(response.data, ID_KEY);
    } catch (error) {
        console.error('❌ [updateTask API] HTTP-Fehler:', error.response?.status);
        console.error('❌ [updateTask API] Fehler-Message:', error.response?.data);
        console.error('❌ [updateTask API] Full Error:', error);
        throw error;
    }
};

export const patchTask = async (task_id, attributes) => {
    const sanitized = sanitizeTaskPayload(attributes);
    const response = await apiClient.patch(`${ENDPOINT}/${task_id}`, sanitized);
    return normalizeEntity(response.data, ID_KEY);
};

export const deleteTask = async (task_id) => {
    const response = await apiClient.delete(`${ENDPOINT}/${task_id}`);
    return response.data;
};

export const updateCompletionRule = async (task_id, completionRule, autoComplete) => {
    const response = await apiClient.patch(`${ENDPOINT}/${task_id}`, {
        completion_rule: completionRule,
        auto_complete: autoComplete
    });
    return normalizeEntity(response.data, ID_KEY);
};

export const updateDeadlineAndUnlock = async (task_id, newDeadline) => {
    const response = await apiClient.patch(`${ENDPOINT}/${task_id}/deadline-unlock`, {
        deadline: newDeadline
    });
    return normalizeEntity(response.data, ID_KEY);
};
