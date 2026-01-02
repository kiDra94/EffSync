import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/task_templates';

export const fetchTaskTemplates = async () => {
    return axios.get(API_BASE_URL);
};

export const fetchTaskTemplateById = async (template_id) => {
    return axios.get(`${API_BASE_URL}/${template_id}`);
};

export const createTaskTemplate = async (templateData) => {
    return axios.post(API_BASE_URL, templateData);
};

export const updateTaskTemplate = async (template_id, templateData) => {
    return axios.put(`${API_BASE_URL}/${template_id}`, templateData);
};

export const deleteTaskTemplate = async (template_id) => {
    return axios.delete(`${API_BASE_URL}/${template_id}`);
};