import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTaskStore } from '@/stores/entities/taskStore';
import * as tasksApi from '@/api/tasks';

vi.mock('@/api/tasks');

describe('TaskStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    const createMockTask = (overrides = {}) => ({
        id: '1',
        task_id: '1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        progress: 0,
        completion_rule: null,
        auto_complete: false,
        parent_task_id: null,
        priority_id: 1,
        assigned_to: '1',
        created_by: 1,
        deadline: '2026-02-15T23:59:00',
        created_at: '2026-01-03T10:00:00',
        updated_at: '2026-01-03T10:00:00',
        ...overrides
    });

    describe('getTasks', () => {
        it('loads tasks successfully', async () => {
            const store = useTaskStore();
            const mockTasks = [createMockTask(), createMockTask({ task_id: '2' })];
            vi.mocked(tasksApi.fetchTasks).mockResolvedValue(mockTasks);

            await store.getTasks();

            expect(store.tasks).toEqual(mockTasks);
        });

        it('throws error when API fails', async () => {
            const store = useTaskStore();
            vi.mocked(tasksApi.fetchTasks).mockRejectedValue(new Error('API Error'));

            await expect(store.getTasks()).rejects.toThrow('API Error');
        });
    });

    describe('addTask', () => {
        it('adds new task to store', async () => {
            const store = useTaskStore();
            const newTaskData = { title: 'New Task', status: 'TODO' };
            const createdTask = createMockTask({ ...newTaskData, task_id: '10' });
            vi.mocked(tasksApi.createTask).mockResolvedValue(createdTask);

            await store.addTask(newTaskData);

            expect(store.tasks).toContainEqual(createdTask);
        });

        it('throws error on creation failure', async () => {
            const store = useTaskStore();
            vi.mocked(tasksApi.createTask).mockRejectedValue(new Error('Creation Failed'));

            await expect(store.addTask({})).rejects.toThrow('Creation Failed');
        });

        it('maintains existing tasks on error', async () => {
            const store = useTaskStore();
            const existing = createMockTask();
            store.tasks = [existing];
            vi.mocked(tasksApi.createTask).mockRejectedValue(new Error('Error'));

            try {
                await store.addTask({});
            } catch {
                // the rejection itself is not under test here
            }

            expect(store.tasks).toContainEqual(existing);
        });
    });

    describe('editTask', () => {
        it('updates existing task', async () => {
            const store = useTaskStore();
            const original = createMockTask({ task_id: '1' });
            const updated = { ...original, title: 'Updated' };
            store.tasks = [original];
            vi.mocked(tasksApi.updateTask).mockResolvedValue(updated);

            await store.editTask('1', { title: 'Updated' });

            expect(store.tasks[0].title).toBe('Updated');
        });

        it('throws error on update failure', async () => {
            const store = useTaskStore();
            store.tasks = [createMockTask()];
            vi.mocked(tasksApi.updateTask).mockRejectedValue(new Error('Update Failed'));

            await expect(store.editTask('1', {})).rejects.toThrow('Update Failed');
        });
    });

    describe('removeTask', () => {
        it('removes task from store', async () => {
            const store = useTaskStore();
            const task1 = createMockTask({ task_id: '1' });
            const task2 = createMockTask({ task_id: '2' });
            store.tasks = [task1, task2];
            vi.mocked(tasksApi.deleteTask).mockResolvedValue({});

            await store.removeTask('2');

            expect(store.tasks).toHaveLength(1);
            expect(store.tasks[0].task_id).toBe('1');
        });

        it('throws error on deletion failure', async () => {
            const store = useTaskStore();
            store.tasks = [createMockTask()];
            vi.mocked(tasksApi.deleteTask).mockRejectedValue(new Error('Delete Failed'));

            await expect(store.removeTask('1')).rejects.toThrow('Delete Failed');
        });
    });

    describe('changeStatus', () => {
        // T100 (M16): COMPLETED only at 100 %; the store no longer sets the progress itself
        it('changes task status to COMPLETED without touching the progress', async () => {
            const store = useTaskStore();
            const task = createMockTask({ task_id: '1', progress: 100 });
            store.tasks = [task];
            vi.mocked(tasksApi.patchTask).mockResolvedValue({});

            await store.changeStatus('1', 'COMPLETED');

            expect(store.tasks[0].status).toBe('COMPLETED');
            expect(store.tasks[0].progress).toBe(100);
            expect(tasksApi.patchTask).toHaveBeenCalledWith('1', { status: 'COMPLETED' });
        });

        it('changes status without modifying progress for non-COMPLETED', async () => {
            const store = useTaskStore();
            const task = createMockTask({ progress: 50 });
            store.tasks = [task];
            vi.mocked(tasksApi.patchTask).mockResolvedValue({});

            await store.changeStatus('1', 'IN_PROGRESS');

            expect(store.tasks[0].status).toBe('IN_PROGRESS');
            expect(store.tasks[0].progress).toBe(50);
        });

        it('throws error on patch failure', async () => {
            const store = useTaskStore();
            store.tasks = [createMockTask()];
            vi.mocked(tasksApi.patchTask).mockRejectedValue(new Error('Patch Failed'));

            await expect(store.changeStatus('1', 'COMPLETED')).rejects.toThrow('Patch Failed');
            // review M16: a refused change (e.g. COMPLETED below 100 %) is rolled back
            expect(store.tasks[0].status).toBe('TODO');
        });
    });

    describe('getSubtasks', () => {
        it('returns direct children of parent task', () => {
            const store = useTaskStore();
            const parent = createMockTask({ task_id: '1', parent_task_id: null });
            const child1 = createMockTask({ task_id: '2', parent_task_id: '1' });
            const child2 = createMockTask({ task_id: '3', parent_task_id: '1' });
            store.tasks = [parent, child1, child2];

            const subtasks = store.getSubtasks('1');

            expect(subtasks).toHaveLength(2);
            expect(subtasks).toContainEqual(child1);
            expect(subtasks).toContainEqual(child2);
        });

        it('returns empty array when no subtasks exist', () => {
            const store = useTaskStore();
            store.tasks = [createMockTask()];

            const subtasks = store.getSubtasks('999');

            expect(subtasks).toHaveLength(0);
        });
    });

    describe('createTaskWithSubtasks', () => {
        it('creates parent task and subtasks together', async () => {
            const store = useTaskStore();
            const parentData = { title: 'Parent', status: 'TODO' };
            const subtasksData = [{ title: 'Sub 1' }, { title: 'Sub 2' }];

            const parent = createMockTask({ ...parentData, task_id: '10' });
            const sub1 = createMockTask({ title: 'Sub 1', task_id: '11', parent_task_id: '10' });
            const sub2 = createMockTask({ title: 'Sub 2', task_id: '12', parent_task_id: '10' });

            vi.mocked(tasksApi.createTask)
                .mockResolvedValueOnce(parent)
                .mockResolvedValueOnce(sub1)
                .mockResolvedValueOnce(sub2);

            const result = await store.createTaskWithSubtasks(parentData, subtasksData);

            expect(result.parentTask.task_id).toBe('10');
            expect(result.subtasks).toHaveLength(2);
        });

        it('skips empty subtask titles', async () => {
            const store = useTaskStore();
            const parent = createMockTask({ task_id: '10' });
            const sub = createMockTask({ task_id: '11', parent_task_id: '10' });

            vi.mocked(tasksApi.createTask)
                .mockResolvedValueOnce(parent)
                .mockResolvedValueOnce(sub);

            await store.createTaskWithSubtasks(
                { title: 'Parent' },
                [{ title: '  ' }, { title: 'Valid' }]
            );

            expect(vi.mocked(tasksApi.createTask)).toHaveBeenCalledTimes(2);
        });

        it('throws error if parent creation fails', async () => {
            const store = useTaskStore();
            vi.mocked(tasksApi.createTask).mockRejectedValue(new Error('Failed'));

            await expect(store.createTaskWithSubtasks({}, [])).rejects.toThrow('Failed');
        });
    });

    // describe('evaluateCompletionRule', () => {
    //     it('evaluates simple leaf rule (completed)', () => {
    //         const store = useTaskStore();
    //         const completed = createMockTask({ task_id: '2', status: 'COMPLETED' });
    //         store.tasks = [completed];

    //         const result = store.evaluateCompletionRule({ type: 'leaf', task_id: '2' });

    //         expect(result).toBe(true);
    //     });

    //     it('evaluates simple leaf rule (incomplete)', () => {
    //         const store = useTaskStore();
    //         const incomplete = createMockTask({ task_id: '2', status: 'TODO' });
    //         store.tasks = [incomplete];

    //         const result = store.evaluateCompletionRule({ type: 'leaf', task_id: '2' });

    //         expect(result).toBe(false);
    //     });

    //     it('evaluates AND operator correctly', () => {
    //         const store = useTaskStore();
    //         const task1 = createMockTask({ task_id: '1', status: 'COMPLETED' });
    //         const task2 = createMockTask({ task_id: '2', status: 'COMPLETED' });
    //         store.tasks = [task1, task2];

    //         const result = store.evaluateCompletionRule({
    //             type: 'operator',
    //             operator: 'AND',
    //             operands: [
    //                 { type: 'leaf', task_id: '1' },
    //                 { type: 'leaf', task_id: '2' }
    //             ]
    //         });

    //         expect(result).toBe(true);
    //     });

    //     it('returns false for non-existent task', () => {
    //         const store = useTaskStore();
    //         store.tasks = [];

    //         const result = store.evaluateCompletionRule({ type: 'leaf', task_id: '999' });

    //         expect(result).toBe(false);
    //     });
    // });

    // describe('isLogicFulfilled', () => {
    //     it('returns true when rule is fulfilled', () => {
    //         const store = useTaskStore();
    //         const parent = createMockTask({
    //             task_id: '1',
    //             completion_rule: '{"type":"leaf","task_id":"2"}'
    //         });
    //         const child = createMockTask({ task_id: '2', status: 'COMPLETED' });
    //         store.tasks = [parent, child];

    //         expect(store.isLogicFulfilled('1')).toBe(true);
    //     });

    //     it('returns false when rule is not fulfilled', () => {
    //         const store = useTaskStore();
    //         const parent = createMockTask({
    //             task_id: '1',
    //             completion_rule: '{"type":"leaf","task_id":"2"}'
    //         });
    //         const child = createMockTask({ task_id: '2', status: 'TODO' });
    //         store.tasks = [parent, child];

    //         expect(store.isLogicFulfilled('1')).toBe(false);
    //     });

    //     it('returns null when task has no completion rule', () => {
    //         const store = useTaskStore();
    //         store.tasks = [createMockTask({ completion_rule: null })];

    //         expect(store.isLogicFulfilled('1')).toBe(null);
    //     });
    // });

    // describe('saveCompletionRule', () => {
    //     it('saves rule and updates store', async () => {
    //         const store = useTaskStore();
    //         const task = createMockTask();
    //         store.tasks = [task];
    //         const rule = { type: 'leaf', task_id: '2' };
    //         vi.mocked(tasksApi.updateCompletionRule).mockResolvedValue({});

    //         await store.saveCompletionRule('1', rule, true);

    //         expect(store.tasks[0].completion_rule).toBe(JSON.stringify(rule));
    //         expect(store.tasks[0].auto_complete).toBe(true);
    //     });

    //     it('handles string rule input', async () => {
    //         const store = useTaskStore();
    //         store.tasks = [createMockTask()];
    //         const ruleString = '{"type":"leaf","task_id":"2"}';
    //         vi.mocked(tasksApi.updateCompletionRule).mockResolvedValue({});

    //         await store.saveCompletionRule('1', ruleString, true);

    //         expect(tasksApi.updateCompletionRule).toHaveBeenCalledWith('1', ruleString, true);
    //     });

    //     it('throws error on save failure', async () => {
    //         const store = useTaskStore();
    //         store.tasks = [createMockTask()];
    //         vi.mocked(tasksApi.updateCompletionRule).mockRejectedValue(new Error('Save Failed'));

    //         await expect(store.saveCompletionRule('1', {}, true)).rejects.toThrow('Save Failed');
    //     });
    // });

    // describe('checkAffectedParents', () => {
    //     it('auto-completes parent when rule is fulfilled', async () => {
    //         const store = useTaskStore();
    //         const parent = createMockTask({
    //             task_id: '1',
    //             auto_complete: true,
    //             status: 'IN_PROGRESS',
    //             completion_rule: '{"type":"leaf","task_id":"2"}'
    //         });
    //         const child = createMockTask({ task_id: '2', status: 'COMPLETED' });
    //         store.tasks = [parent, child];
    //         vi.mocked(tasksApi.patchTask).mockResolvedValue({});

    //         const changeStatusSpy = vi.spyOn(store, 'changeStatus').mockResolvedValue(undefined);
    //         await store.checkAffectedParents('2');

    //         expect(vi.mocked(tasksApi.patchTask)).toHaveBeenCalledWith('1', 
    //             expect.objectContaining({ status: 'COMPLETED' })
    //         );
    //         changeStatusSpy.mockRestore();
    //     });

    //     it('does not auto-complete when flag is false', async () => {
    //         const store = useTaskStore();
    //         const parent = createMockTask({
    //             task_id: '1',
    //             auto_complete: false,
    //             completion_rule: '{"type":"leaf","task_id":"2"}'
    //         });
    //         const child = createMockTask({ task_id: '2', status: 'COMPLETED' });
    //         store.tasks = [parent, child];

    //         await store.checkAffectedParents('2');

    //         expect(tasksApi.patchTask).not.toHaveBeenCalled();
    //     });

    //     it('reverts to IN_PROGRESS when rule no longer fulfilled', async () => {
    //         const store = useTaskStore();
    //         const parent = createMockTask({
    //             task_id: '1',
    //             auto_complete: true,
    //             status: 'COMPLETED',
    //             completion_rule: '{"type":"leaf","task_id":"2"}'
    //         });
    //         const child = createMockTask({ task_id: '2', status: 'TODO' });
    //         store.tasks = [parent, child];
    //         vi.mocked(tasksApi.patchTask).mockResolvedValue({});

    //         const changeStatusSpy = vi.spyOn(store, 'changeStatus').mockResolvedValue(undefined);
    //         await store.checkAffectedParents('2');

    //         expect(vi.mocked(tasksApi.patchTask)).toHaveBeenCalledWith('1', 
    //             expect.objectContaining({ status: 'IN_PROGRESS' })
    //         );
    //         changeStatusSpy.mockRestore();
    //     });
    // });

    // describe('evaluateCompletionRule', () => {
    //     it('evaluates simple leaf rule (completed)', () => {
    //         const store = useTaskStore();
    //         const completed = createMockTask({ task_id: '2', status: 'COMPLETED' });
    //         store.tasks = [completed];
    
    //         const result = store.evaluateCompletionRule({ type: 'leaf', task_id: '2' });
    
    //         expect(result).toBe(true);
    //     });
    
    //     it('evaluates simple leaf rule (incomplete)', () => {
    //         const store = useTaskStore();
    //         const incomplete = createMockTask({ task_id: '2', status: 'TODO' });
    //         store.tasks = [incomplete];
    
    //         const result = store.evaluateCompletionRule({ type: 'leaf', task_id: '2' });
    
    //         expect(result).toBe(false);
    //     });
    
    //     it('evaluates AND operator correctly', () => {
    //         const store = useTaskStore();
    //         const task1 = createMockTask({ task_id: '1', status: 'COMPLETED' });
    //         const task2 = createMockTask({ task_id: '2', status: 'COMPLETED' });
    //         store.tasks = [task1, task2];
    
    //         const result = store.evaluateCompletionRule({
    //             type: 'operator',
    //             operator: 'AND',
    //             operands: [
    //                 { type: 'leaf', task_id: '1' },
    //                 { type: 'leaf', task_id: '2' }
    //             ]
    //         });
    
    //         expect(result).toBe(true);
    //     });
    
    //     it('evaluates OR operator correctly', () => {
    //         const store = useTaskStore();
    //         const t1 = createMockTask({ task_id: '1', status: 'COMPLETED' });
    //         const t2 = createMockTask({ task_id: '2', status: 'TODO' });
    //         store.tasks = [t1, t2];
    
    //         const result = store.evaluateCompletionRule({
    //             type: 'operator',
    //             operator: 'OR',
    //             operands: [
    //                 { type: 'leaf', task_id: '1' },
    //                 { type: 'leaf', task_id: '2' }
    //             ]
    //         });
    
    //         expect(result).toBe(true);
    //     });
    
    //     it('evaluates XOR operator with one true as true', () => {
    //         const store = useTaskStore();
    //         const t1 = createMockTask({ task_id: '1', status: 'COMPLETED' });
    //         const t2 = createMockTask({ task_id: '2', status: 'TODO' });
    //         store.tasks = [t1, t2];
    
    //         const result = store.evaluateCompletionRule({
    //             type: 'operator',
    //             operator: 'XOR',
    //             operands: [
    //                 { type: 'leaf', task_id: '1' },
    //                 { type: 'leaf', task_id: '2' }
    //             ]
    //         });
    
    //         expect(result).toBe(true);
    //     });
    
    //     it('evaluates NOT operator correctly', () => {
    //         const store = useTaskStore();
    //         const t = createMockTask({ task_id: '1', status: 'TODO' });
    //         store.tasks = [t];
    
    //         const result = store.evaluateCompletionRule({
    //             type: 'operator',
    //             operator: 'NOT',
    //             operands: [
    //                 { type: 'leaf', task_id: '1' }
    //             ]
    //         });
    
    //         expect(result).toBe(true);
    //     });
    
    //     it('returns false for non-existent task', () => {
    //         const store = useTaskStore();
    //         store.tasks = [];
    
    //         const result = store.evaluateCompletionRule({ type: 'leaf', task_id: '999' });
    
    //         expect(result).toBe(false);
    //     });
    // });    

    describe('Edge Cases', () => {
        it('handles empty task list', () => {
            const store = useTaskStore();
            expect(store.getSubtasks('1')).toEqual([]);
        });

        // it('handles null completion rule gracefully', () => {
        //     const store = useTaskStore();
        //     store.tasks = [createMockTask({ completion_rule: null })];

        //     const result = store.isLogicFulfilled('1');

        //     expect(result).toBeNull();
        // });

        // it('handles non-existent task ID', () => {
        //     const store = useTaskStore();
        //     store.tasks = [createMockTask({ task_id: '1' })];

        //     const result = store.evaluateCompletionRule({ type: 'leaf', task_id: '999' });

        //     expect(result).toBe(false);
        // });
    });
});
