import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './httpClient';
import { classesApi, departmentsApi, roomsApi, schedulesApi, subjectsApi } from './schoolOrganization';

vi.mock('./httpClient');

// GOALS.md M36 (decision D1): the school areas call the real API
describe('school organization api', () => {
  beforeEach(() => {
    apiClient.get = vi.fn().mockResolvedValue({ data: [] });
    apiClient.post = vi.fn().mockResolvedValue({ data: {} });
    apiClient.patch = vi.fn().mockResolvedValue({ data: {} });
    apiClient.put = vi.fn().mockResolvedValue({ data: {} });
    apiClient.delete = vi.fn().mockResolvedValue({ data: {} });
  });

  it.each([
    ['/departments', departmentsApi],
    ['/subjects', subjectsApi],
    ['/rooms', roomsApi],
    ['/schedules', schedulesApi],
    ['/classes', classesApi],
  ])('%s: list, get, create, update and delete', async (endpoint, api) => {
    await api.list();
    await api.get(3);
    await api.create({ name: 'A' });
    await api.update(3, { name: 'B' });
    await api.remove(3);

    expect(apiClient.get).toHaveBeenCalledWith(endpoint);
    expect(apiClient.get).toHaveBeenCalledWith(`${endpoint}/3`);
    expect(apiClient.post).toHaveBeenCalledWith(endpoint, { name: 'A' });
    expect(apiClient.patch).toHaveBeenCalledWith(`${endpoint}/3`, { name: 'B' });
    expect(apiClient.delete).toHaveBeenCalledWith(`${endpoint}/3`);
  });

  it('replaces a class\'s students and teachers (decision D2)', async () => {
    await classesApi.replaceStudents(5, [7, 8]);
    await classesApi.replaceTeachers(5, [3]);
    await classesApi.assignable();

    expect(apiClient.put).toHaveBeenCalledWith('/classes/5/students', { student_ids: [7, 8] });
    expect(apiClient.put).toHaveBeenCalledWith('/classes/5/teachers', { teacher_ids: [3] });
    expect(apiClient.get).toHaveBeenCalledWith('/classes/assignable');
  });
});
