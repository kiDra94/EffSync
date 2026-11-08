import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/httpClient';
import {
    fetchTasks,
    fetchTaskById,
    createTask,
    updateTask,
    deleteTask,
    patchTask,
    updateCompletionRule
} from '@/api/tasks';


describe('Tasks API', () => {
    let mock;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        vi.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
    });

    describe('fetchTasks', () => {
        it('fetches all tasks', async () => {
            const mockTasks = [
                { id: '1', title: 'Task 1', status: 'TODO' },
                { id: '2', title: 'Task 2', status: 'TODO' },
            ]

            mock.onGet('/tasks').reply(200, mockTasks);
            const response = await fetchTasks();
            
            const respTasks = [
                { task_id: '1', title: 'Task 1', status: 'TODO', id: '1' },
                { task_id: '2', title: 'Task 2', status: 'TODO', id: '2' },
            ]
            expect(response).toEqual(respTasks);
        })

        it('throws error on failed request', async () => {
            mock.onGet('/tasks').reply(500);
            await expect(fetchTasks()).rejects.toThrow();
        })

        // M17 (decision B3): the list is paged; the store needs every page
        it('reads all pages of the paged list', async () => {
            mock.onGet('/tasks').reply((config) => {
                const page = config.params.page;
                const data = page === 1
                    ? Array.from({ length: 100 }, (_, i) => ({ task_id: i + 1 }))
                    : [{ task_id: 101 }];
                return [200, { data, meta: { total: 101, page, limit: 100, totalPages: 2 } }];
            });

            const tasks = await fetchTasks();

            expect(tasks).toHaveLength(101);
            expect(mock.history.get.map((r) => r.params)).toEqual([
                { includeRelations: true, page: 1, limit: 100 },
                { includeRelations: true, page: 2, limit: 100 },
            ]);
        })
    })

    // M18: tags (T59) and the template link (T110) reach the backend
    describe('task payload', () => {
        it('sends tags and template_id', async () => {
            mock.onPost('/tasks').reply(201, { task_id: '9' });
            await createTask({ title: 'A', tags: ['mathe'], template_id: 3, unknown: 'x' });
            expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ tags: ['mathe'], template_id: 3 });
            expect(JSON.parse(mock.history.post[0].data)).not.toHaveProperty('unknown');
        })
    })

    describe('fetchTaskById', () => {
        it('fetching a Task by ID', async () => {
            const mockTask = { id: '1', title: 'Task 1', status: 'TODO' };

            mock.onGet('/tasks/1').reply(200, mockTask);
            const response = await fetchTaskById('1');

            const respTask = { task_id: '1', title: 'Task 1', status: 'TODO', id: '1' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            mock.onGet('/tasks/1').reply(500);
            await expect(fetchTaskById('1')).rejects.toThrow();
        })
    })

    describe('createTask', () => {
        it('creates a new task', async () => {
            const taskData = { title: 'New Task', status: 'TODO' };
            const mockResponse = { id: '3', title: 'New Task', status: 'TODO' };

            mock.onPost('/tasks').reply(201, mockResponse);
            const response = await createTask(taskData);

            const respTask = { task_id: '3', title: 'New Task', status: 'TODO', id: '3' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            const taskData = { title: 'New Task', status: 'TODO' };
            
            mock.onPost('/tasks').reply(500);
            await expect(createTask(taskData)).rejects.toThrow();
        })
    })

    describe('updateTask', () => {
        it('updates an existing task', async () => {
            const taskData = { title: 'Updated Task', status: 'IN_PROGRESS' };
            const mockResponse = { id: '1', title: 'Updated Task', status: 'IN_PROGRESS' };

            mock.onPatch('/tasks/1').reply(200, mockResponse);
            const response = await updateTask('1', taskData);

            const respTask = { task_id: '1', title: 'Updated Task', status: 'IN_PROGRESS', id: '1' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            const taskData = { title: 'Updated Task', status: 'IN_PROGRESS' };
            
            mock.onPatch('/tasks/1').reply(500);
            await expect(updateTask('1', taskData)).rejects.toThrow();
        })
    })

    describe('deleteTask', () => {
        it('deletes a task', async () => {
            const mockResponse = { success: true };

            mock.onDelete('/tasks/1').reply(204, mockResponse);
            const response = await deleteTask('1');
            
            expect(response).toBeDefined();
        })

        it('throws error on failed request', async () => {
            mock.onDelete('/tasks/1').reply(500);
            await expect(deleteTask('1')).rejects.toThrow();
        })
    })

    describe('patchTask', () => {
        it('patches a task with partial data', async () => {
            const attributes = { status: 'COMPLETED' };
            const mockResponse = { id: '1', title: 'Task 1', status: 'COMPLETED' };

            mock.onPatch('/tasks/1').reply(200, mockResponse);
            const response = await patchTask('1', attributes);

            const respTask = { task_id: '1', title: 'Task 1', status: 'COMPLETED', id: '1' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            const attributes = { status: 'COMPLETED' };
            
            mock.onPatch('/tasks/1').reply(500);
            await expect(patchTask('1', attributes)).rejects.toThrow();
        })
    })

    describe('updateCompletionRule', () => {
        it('updates completion rule for a task', async () => {
            const completionRule = { type: 'all_subtasks' };
            const mockResponse = { id: '1', title: 'Task 1', status: 'TODO', completion_rule: completionRule, auto_complete: true };

            mock.onPatch('/tasks/1').reply(200, mockResponse);
            const response = await updateCompletionRule('1', completionRule, true);

            expect(response.auto_complete).toBe(true);
            expect(response.task_id).toEqual('1');
        })

        it('throws error on failed request', async () => {
            const completionRule = { type: 'all_subtasks' };
            
            mock.onPatch('/tasks/1').reply(500);
            await expect(updateCompletionRule('1', completionRule, true)).rejects.toThrow();
        })
    })
});
