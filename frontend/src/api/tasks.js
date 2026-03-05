import { apiClient } from '@/api/httpClient';
import {
    normalizeEntity,
    normalizeEntities,
    serializeEntity
} from '@/config/api.config'

const ENDPOINT = '/tasks';
const ID_KEY = 'task_id';

export const fetchTasks = async () => {
    const response = await apiClient.get(ENDPOINT);
	const tasks = response.data?.data ?? response.data;
    return normalizeEntities(tasks, ID_KEY);
};

export const fetchTaskById = async (task_id) => {
    const response = await apiClient.get(`${ENDPOINT}/${task_id}`);
    return normalizeEntity(response.data, ID_KEY);
};

export const createTask = async (taskData) => {
    const response = await apiClient.post(ENDPOINT, serializeEntity(taskData, ID_KEY));
    return normalizeEntity(response.data, ID_KEY);
};

export const updateTask = async (task_id, taskData) => {
    const serializedData = serializeEntity(taskData, ID_KEY);
    const response = await apiClient.patch(`${ENDPOINT}/${task_id}`, serializedData);
    return normalizeEntity(response.data, ID_KEY);
};

export const patchTask = async (task_id, attributes) => {
    const response = await apiClient.patch(`${ENDPOINT}/${task_id}`, { attributes });
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
