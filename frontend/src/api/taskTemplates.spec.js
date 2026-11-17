import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchTaskTemplates,
  fetchTaskTemplateById,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
} from './taskTemplates';
import { apiClient } from './httpClient';

vi.mock('./httpClient');

// THESIS: T110 – the frontend called the stub /templates; the real API is /tasks/templates (M15, decision Q6)
describe('taskTemplates api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchTaskTemplates calls /tasks/templates', async () => {
    apiClient.get = vi.fn().mockResolvedValue({ data: [{ template_id: 1, name: 'A' }] });

    const result = await fetchTaskTemplates();

    expect(apiClient.get).toHaveBeenCalledWith('/tasks/templates');
    expect(result[0]).toMatchObject({ template_id: 1, name: 'A' });
  });

  it('fetchTaskTemplateById calls /tasks/templates/:id', async () => {
    apiClient.get = vi.fn().mockResolvedValue({ data: { template_id: 7 } });

    await fetchTaskTemplateById(7);

    expect(apiClient.get).toHaveBeenCalledWith('/tasks/templates/7');
  });

  it('createTaskTemplate posts to /tasks/templates', async () => {
    apiClient.post = vi.fn().mockResolvedValue({ data: { template_id: 3 } });

    await createTaskTemplate({ name: 'New' });

    expect(apiClient.post).toHaveBeenCalledWith('/tasks/templates', expect.objectContaining({ name: 'New' }));
  });

  it('updateTaskTemplate patches /tasks/templates/:id', async () => {
    apiClient.patch = vi.fn().mockResolvedValue({ data: { template_id: 3 } });

    await updateTaskTemplate(3, { name: 'Renamed' });

    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/templates/3', expect.objectContaining({ name: 'Renamed' }));
  });

  it('deleteTaskTemplate deletes /tasks/templates/:id', async () => {
    apiClient.delete = vi.fn().mockResolvedValue({ data: {} });

    await deleteTaskTemplate(3);

    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/templates/3');
  });
});
