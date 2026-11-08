import { apiClient } from '@/api/httpClient';

/**
 * School organization on the real API (GOALS.md M36, T26, decision D1):
 * the same CRUD calls for classes, departments, subjects, rooms and schedules.
 */
const crudApi = (endpoint) => ({
    list: async () => (await apiClient.get(endpoint)).data,
    get: async (id) => (await apiClient.get(`${endpoint}/${id}`)).data,
    create: async (data) => (await apiClient.post(endpoint, data)).data,
    update: async (id, data) => (await apiClient.patch(`${endpoint}/${id}`, data)).data,
    remove: async (id) => (await apiClient.delete(`${endpoint}/${id}`)).data,
});

export const departmentsApi = crudApi('/departments');
export const subjectsApi = crudApi('/subjects');
export const roomsApi = crudApi('/rooms');
export const schedulesApi = crudApi('/schedules');

// decision D2: a class's students and teachers, replaced as a whole
export const classesApi = {
    ...crudApi('/classes'),
    assignable: async () => (await apiClient.get('/classes/assignable')).data,
    replaceStudents: async (id, studentIds) =>
        (await apiClient.put(`/classes/${id}/students`, { student_ids: studentIds })).data,
    replaceTeachers: async (id, teacherIds) =>
        (await apiClient.put(`/classes/${id}/teachers`, { teacher_ids: teacherIds })).data,
};
