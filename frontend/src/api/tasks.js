import axios from 'axios';

const API_BASE_URL = '/api/tasks';

export const fetchTasks = async () => {
	return axios.get(API_BASE_URL);
};

export const fetchTaskById = async (id) => {
	return axios.get(`${API_BASE_URL}/${id}`);
};

export const createTask = async (taskData) => {
	return axios.post(API_BASE_URL, taskData);
};

export const updateTask = async (id, taskData) => {
	return axios.put(`${API_BASE_URL}/${id}`, taskData);
};

export const deleteTask = async (id) => {
	return axios.delete(`${API_BASE_URL}/${id}`);
};
