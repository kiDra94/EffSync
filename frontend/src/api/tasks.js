import { apiClient } from '@/api/httpClient';
import {
	buildUrl,
	normalizeTask,
	normalizeTasks,
	serializeTask
} from '@/config/api.config'

const ENDPOINT = '/tasks';

export const fetchTasks = async () => {
	const response = await apiClient.get(buildUrl(ENDPOINT));
	return normalizeTasks(response.data);
};

export const fetchTaskById = async (task_id) => {
	const response = await apiClient.get(buildUrl(`${ENDPOINT}/${task_id}`));
	return normalizeTask(response.data);
};

export const createTask = async (taskData) => {
	const response = await apiClient.post(buildUrl(ENDPOINT), serializeTask(taskData));
	return normalizeTask(response.data);
};

export const updateTask = async (task_id, taskData) => {
	const serializedData = serializeTask(taskData);
	const response = await apiClient.put(buildUrl(`${ENDPOINT}/${task_id}`), serializedData);
	return normalizeTask(response.data);
};

export const patchTask = async (task_id, attributes) => {
	const response = await apiClient.patch(buildUrl(`${ENDPOINT}/${task_id}`), { attributes });
	return normalizeTask(response.data);
};

export const deleteTask = async (task_id) => {
	const response = await apiClient.delete(buildUrl(`${ENDPOINT}/${task_id}`));
    return response.data;
};

export const updateCompletionRule = async (task_id, completionRule, autoComplete) => {
	const response = await apiClient.patch(buildUrl(`${ENDPOINT}/${task_id}`), {
        completion_rule: completionRule,
        auto_complete: autoComplete
    });
    return normalizeTask(response.data)
}