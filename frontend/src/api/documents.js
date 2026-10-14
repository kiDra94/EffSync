import { apiClient } from '@/api/httpClient';
import { normalizeEntity, normalizeEntities } from '@/config/api.config';

const ENDPOINT = '/documents';
const ID_KEY = 'document_id';

export const fetchDocuments = async () => {
  const response = await apiClient.get(ENDPOINT);
  const documents = response.data?.data ?? response.data;
  return normalizeEntities(documents, ID_KEY);
};

export const uploadDocument = async (file, taskId) => {
  const formData = new FormData();
  formData.append('file', file);
  if (taskId !== undefined && taskId !== null && taskId !== '') {
    formData.append('taskId', String(taskId));
  }

  const response = await apiClient.post(`${ENDPOINT}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return normalizeEntity(response.data, ID_KEY);
};

export const renameDocument = async (document_id, name) => {
  const response = await apiClient.patch(`${ENDPOINT}/${document_id}`, { name });
  return normalizeEntity(response.data, ID_KEY);
};

export const gradeDocument = async (document_id, payload) => {
  const response = await apiClient.patch(`${ENDPOINT}/${document_id}/grade`, payload);
  return normalizeEntity(response.data, ID_KEY);
};

export const fetchMyGrades = async () => {
  const response = await apiClient.get(`${ENDPOINT}/my-grades`);
  const grades = response.data?.data ?? response.data;
  return normalizeEntities(grades, ID_KEY);
};

export const deleteDocument = async (document_id) => {
  const response = await apiClient.delete(`${ENDPOINT}/${document_id}`);
  return response.data;
};

export const fetchDocumentBinary = async (document_id) => {
  return apiClient.get(`${ENDPOINT}/${document_id}/download`, {
    responseType: 'blob',
  });
};