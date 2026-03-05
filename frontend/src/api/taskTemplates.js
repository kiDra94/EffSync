import { apiClient } from '@/api/httpClient';
import { normalizeEntity, normalizeEntities, serializeEntity } from '@/config/api.config';

const ENDPOINT = '/task_templates';
const ID_KEY = 'template_id';

export const fetchTaskTemplates = async () => {
    const response = await apiClient.get(ENDPOINT);
    const templates = response.data?.data ?? response.data;
    return normalizeEntities(templates, ID_KEY);
};

export const fetchTaskTemplateById = async (template_id) => {
    const response = await apiClient.get(`${ENDPOINT}/${template_id}`);
    return normalizeEntity(response.data, ID_KEY);
};

export const createTaskTemplate = async (templateData) => {
    const response = await apiClient.post(ENDPOINT, serializeEntity(templateData, ID_KEY));
    return normalizeEntity(response.data, ID_KEY);
};

export const updateTaskTemplate = async (template_id, templateData) => {
    const response = await apiClient.patch(`${ENDPOINT}/${template_id}`, serializeEntity(templateData, ID_KEY));
    return normalizeEntity(response.data, ID_KEY);
};

export const deleteTaskTemplate = async (template_id) => {
    const response = await apiClient.delete(`${ENDPOINT}/${template_id}`);
    return response.data;
};
