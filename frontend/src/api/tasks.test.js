import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, setAuthStoreFunc } from '@/api/httpClient';
import { ref } from 'vue';
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
        setAuthStoreFunc(() => ({
            token: ref('fake-token-123'),
            logout: vi.fn()
        }));
        mock = new MockAdapter(apiClient);
        vi.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
        setAuthStoreFunc(null);
    });

    describe('fetchTask', () => {
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
});