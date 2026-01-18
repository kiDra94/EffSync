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

            mock.onGet('http://localhost:3000/tasks').reply(200, mockTasks);
            const response = await fetchTasks();
            
            const respTasks = [
                { task_id: '1', title: 'Task 1', status: 'TODO', id: '1' },
                { task_id: '2', title: 'Task 2', status: 'TODO', id: '2' },
            ]
            expect(response).toEqual(respTasks);
        })

        it('throws error on failed request', async () => {
            mock.onGet('http://localhost:3000/tasks').reply(500);
            await expect(fetchTasks()).rejects.toThrow();
        })
    })

    describe('fetchTaskById', () => {
        it('fetching a Task by ID', async () => {
            const mockTask = { id: '1', title: 'Task 1', status: 'TODO' };

            mock.onGet('http://localhost:3000/tasks/1').reply(200, mockTask);
            const response = await fetchTaskById('1');

            const respTask = { task_id: '1', title: 'Task 1', status: 'TODO', id: '1' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            mock.onGet('http://localhost:3000/tasks/1').reply(500);
            await expect(fetchTaskById('1')).rejects.toThrow();
        })
    })

    describe('createTask', () => {
        it('creates a new task', async () => {
            const taskData = { title: 'New Task', status: 'TODO' };
            const mockResponse = { id: '3', title: 'New Task', status: 'TODO' };

            mock.onPost('http://localhost:3000/tasks').reply(201, mockResponse);
            const response = await createTask(taskData);

            const respTask = { task_id: '3', title: 'New Task', status: 'TODO', id: '3' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            const taskData = { title: 'New Task', status: 'TODO' };
            
            mock.onPost('http://localhost:3000/tasks').reply(500);
            await expect(createTask(taskData)).rejects.toThrow();
        })
    })

    describe('updateTask', () => {
        it('updates an existing task', async () => {
            const taskData = { title: 'Updated Task', status: 'IN_PROGRESS' };
            const mockResponse = { id: '1', title: 'Updated Task', status: 'IN_PROGRESS' };

            mock.onPut('http://localhost:3000/tasks/1').reply(200, mockResponse);
            const response = await updateTask('1', taskData);

            const respTask = { task_id: '1', title: 'Updated Task', status: 'IN_PROGRESS', id: '1' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            const taskData = { title: 'Updated Task', status: 'IN_PROGRESS' };
            
            mock.onPut('http://localhost:3000/tasks/1').reply(500);
            await expect(updateTask('1', taskData)).rejects.toThrow();
        })
    })

    describe('deleteTask', () => {
        it('deletes a task', async () => {
            const mockResponse = { success: true };

            mock.onDelete('http://localhost:3000/tasks/1').reply(204, mockResponse);
            const response = await deleteTask('1');
            
            expect(response).toBeDefined();
        })

        it('throws error on failed request', async () => {
            mock.onDelete('http://localhost:3000/tasks/1').reply(500);
            await expect(deleteTask('1')).rejects.toThrow();
        })
    })

    describe('patchTask', () => {
        it('patches a task with partial data', async () => {
            const attributes = { status: 'COMPLETED' };
            const mockResponse = { id: '1', title: 'Task 1', status: 'COMPLETED' };

            mock.onPatch('http://localhost:3000/tasks/1').reply(200, mockResponse);
            const response = await patchTask('1', attributes);

            const respTask = { task_id: '1', title: 'Task 1', status: 'COMPLETED', id: '1' };
            expect(response).toEqual(respTask);
        })

        it('throws error on failed request', async () => {
            const attributes = { status: 'COMPLETED' };
            
            mock.onPatch('http://localhost:3000/tasks/1').reply(500);
            await expect(patchTask('1', attributes)).rejects.toThrow();
        })
    })

    describe('updateCompletionRule', () => {
        it('updates completion rule for a task', async () => {
            const completionRule = { type: 'all_subtasks' };
            const mockResponse = { id: '1', title: 'Task 1', status: 'TODO', completion_rule: completionRule, auto_complete: true };

            mock.onPatch('http://localhost:3000/tasks/1').reply(200, mockResponse);
            const response = await updateCompletionRule('1', completionRule, true);

            expect(response.auto_complete).toBe(true);
            expect(response.task_id).toEqual('1');
        })

        it('throws error on failed request', async () => {
            const completionRule = { type: 'all_subtasks' };
            
            mock.onPatch('http://localhost:3000/tasks/1').reply(500);
            await expect(updateCompletionRule('1', completionRule, true)).rejects.toThrow();
        })
    })
});
