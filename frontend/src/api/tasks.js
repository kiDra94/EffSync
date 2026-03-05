import { apiClient } from '@/api/httpClient';
import {
	normalizeTask,
	normalizeTasks,
	serializeTask
} from '@/config/api.config'

const ENDPOINT = '/tasks';

export const fetchTasks = async () => {
	const response = await apiClient.get(ENDPOINT);
	return normalizeTasks(response.data);
};

export const fetchTaskById = async (task_id) => {
	const response = await apiClient.get(`${ENDPOINT}/${task_id}`);
	return normalizeTask(response.data);
};

export const createTask = async (taskData) => {
	const response = await apiClient.post(ENDPOINT, serializeTask(taskData));
	return normalizeTask(response.data);
};

export const updateTask = async (task_id, taskData) => {
	const serializedData = serializeTask(taskData);
	const response = await apiClient.put(`${ENDPOINT}/${task_id}`, serializedData);
	return normalizeTask(response.data);
};

export const patchTask = async (task_id, attributes) => {
	const response = await apiClient.patch(`${ENDPOINT}/${task_id}`, { attributes });
	return normalizeTask(response.data);
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
    return normalizeTask(response.data)
}