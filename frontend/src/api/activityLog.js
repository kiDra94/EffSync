import { apiClient } from '@/api/httpClient';

// the audit log of all tasks, deleted ones included (T33, UC-32, M15/M27)
export const fetchAuditLog = async (params) => (await apiClient.get('/tasks/activity', { params })).data;
