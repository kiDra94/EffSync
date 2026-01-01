import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/tasks';

export const fetchTasks = async () => {
	return axios.get(API_BASE_URL);
};

export const fetchTaskById = async (task_id) => {
	return axios.get(`${API_BASE_URL}/${task_id}`);
};

export const createTask = async (taskData) => {
	return axios.post(API_BASE_URL, taskData);
};

export const updateTask = async (task_id, taskData) => {
	return axios.put(`${API_BASE_URL}/${task_id}`, taskData);
};

export const deleteTask = async (task_id) => {
	return axios.delete(`${API_BASE_URL}/${task_id}`);
};
