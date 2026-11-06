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

// THESIS: T110 – the frontend called the stub /templates, the real API is /task-templates
describe('taskTemplates api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchTaskTemplates calls /task-templates', async () => {
    apiClient.get = vi.fn().mockResolvedValue({ data: [{ template_id: 1, name: 'A' }] });

    const result = await fetchTaskTemplates();

    expect(apiClient.get).toHaveBeenCalledWith('/task-templates');
    expect(result[0]).toMatchObject({ template_id: 1, name: 'A' });
  });

  it('fetchTaskTemplateById calls /task-templates/:id', async () => {
    apiClient.get = vi.fn().mockResolvedValue({ data: { template_id: 7 } });

    await fetchTaskTemplateById(7);

    expect(apiClient.get).toHaveBeenCalledWith('/task-templates/7');
  });

  it('createTaskTemplate posts to /task-templates', async () => {
    apiClient.post = vi.fn().mockResolvedValue({ data: { template_id: 3 } });

    await createTaskTemplate({ name: 'New' });

    expect(apiClient.post).toHaveBeenCalledWith('/task-templates', expect.objectContaining({ name: 'New' }));
  });

  it('updateTaskTemplate patches /task-templates/:id', async () => {
    apiClient.patch = vi.fn().mockResolvedValue({ data: { template_id: 3 } });

    await updateTaskTemplate(3, { name: 'Renamed' });

    expect(apiClient.patch).toHaveBeenCalledWith('/task-templates/3', expect.objectContaining({ name: 'Renamed' }));
  });

  it('deleteTaskTemplate deletes /task-templates/:id', async () => {
    apiClient.delete = vi.fn().mockResolvedValue({ data: {} });

    await deleteTaskTemplate(3);

    expect(apiClient.delete).toHaveBeenCalledWith('/task-templates/3');
  });
});
