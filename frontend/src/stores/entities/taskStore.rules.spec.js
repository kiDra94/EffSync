import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/tasks')
vi.mock('../useSocket', () => ({ useSocket: () => ({ socket_on: vi.fn(), socket_off: vi.fn() }) }))

import { useTaskStore } from './taskStore'
import * as tasksApi from '@/api/tasks'

const leaf = (id) => ({ type: 'leaf', task_id: id })
const op = (operator, ...operands) => ({ type: 'operator', operator, operands })

// GOALS.md M29 (T115, 08_…:39-43: the task store ≥ 90 %): the completion
// rules, the parent check after a status change, and subtasks
describe('taskStore completion rules', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store = useTaskStore()
    store.tasks = [
      { task_id: 1, status: 'COMPLETED' },
      { task_id: 2, status: 'TODO' },
      { task_id: 3, status: 'COMPLETED' },
    ]
  })

  it.each([
    ['a completed leaf', leaf(1), true],
    ['an open leaf', leaf(2), false],
    ['AND of completed', op('AND', leaf(1), leaf(3)), true],
    ['AND with an open one', op('AND', leaf(1), leaf(2)), false],
    ['an empty AND', op('AND'), false],
    ['OR', op('OR', leaf(2), leaf(3)), true],
    ['XOR of one', op('XOR', leaf(1), leaf(2)), true],
    ['XOR of two', op('XOR', leaf(1), leaf(3)), false],
    ['NOT', op('NOT', leaf(2)), true],
    ['an empty NOT', op('NOT'), true],
    ['an unknown operator', op('NAND', leaf(1)), false],
    ['an operator without operands', { type: 'operator', operator: 'OR' }, false],
    ['an unknown node', { type: 'other' }, false],
    ['no rule', null, false],
  ])('evaluates %s', (_name, rule, expected) => {
    expect(store.evaluateCompletionRule(rule)).toBe(expected)
  })

  it('reads a rule stored as JSON text and refuses broken JSON', () => {
    expect(store.evaluateCompletionRule(JSON.stringify(leaf(1)))).toBe(true)
    expect(store.evaluateCompletionRule('{kaputt')).toBe(false)
  })

  it('tells whether the rule of a task is fulfilled, null without a rule', () => {
    store.tasks.push({ task_id: 9, completion_rule: op('AND', leaf(1), leaf(3)) })

    expect(store.isLogicFulfilled(9)).toBe(true)
    expect(store.isLogicFulfilled(2)).toBeNull()
    expect(store.isLogicFulfilled(99)).toBeNull()
  })

  describe('parents after a status change', () => {
    it('completes a parent whose rule is now fulfilled, and its own parent in turn', async () => {
      store.tasks = [
        { task_id: 1, status: 'TODO', progress: 0 },
        { task_id: 5, status: 'TODO', progress: 0, auto_complete: true, completion_rule: leaf(1) },
        { task_id: 6, status: 'TODO', progress: 0, auto_complete: true, completion_rule: JSON.stringify(leaf(5)) },
      ]
      vi.mocked(tasksApi.patchTask).mockResolvedValue({})

      await store.changeStatus(1, 'COMPLETED')

      expect(tasksApi.patchTask).toHaveBeenCalledWith(5, { status: 'COMPLETED', progress: 100 })
      expect(tasksApi.patchTask).toHaveBeenCalledWith(6, { status: 'COMPLETED', progress: 100 })
      expect(store.tasks.find((t) => t.task_id === 6).progress).toBe(100)
    })

    it('reopens a completed parent whose rule no longer holds', async () => {
      store.tasks = [
        { task_id: 1, status: 'COMPLETED', progress: 100 },
        { task_id: 5, status: 'COMPLETED', progress: 100, auto_complete: true, completion_rule: leaf(1) },
      ]
      vi.mocked(tasksApi.patchTask).mockResolvedValue({})

      await store.changeStatus(1, 'IN_PROGRESS')

      expect(tasksApi.patchTask).toHaveBeenCalledWith(5, { status: 'IN_PROGRESS', progress: 0 })
    })

    it('leaves a parent without auto_complete alone', async () => {
      store.tasks = [
        { task_id: 1, status: 'COMPLETED' },
        { task_id: 3, status: 'TODO', completion_rule: leaf(1) },
      ]

      await store.checkAffectedParents(1)

      expect(tasksApi.patchTask).not.toHaveBeenCalled()
    })

    // review M29: the rules point at each other; each task changes once
    it('follows a cycle of rules only once per task', async () => {
      store.tasks = [
        { task_id: 1, status: 'COMPLETED', progress: 100, auto_complete: true, completion_rule: leaf(2) },
        { task_id: 2, status: 'TODO', progress: 0, auto_complete: true, completion_rule: leaf(1) },
      ]
      vi.mocked(tasksApi.patchTask).mockResolvedValue({})

      await store.checkAffectedParents(1)

      // 2 completes because 1 is done; 1's rule (2) is then fulfilled too, and
      // the visited set stops the walk instead of looping
      expect(vi.mocked(tasksApi.patchTask).mock.calls).toEqual([[2, { status: 'COMPLETED', progress: 100 }]])
    })
  })

  it('puts a refused status back', async () => {
    store.tasks = [{ task_id: 1, status: 'TODO' }]
    vi.mocked(tasksApi.patchTask).mockRejectedValue(new Error('400'))

    await expect(store.changeStatus(1, 'COMPLETED')).rejects.toThrow('400')
    expect(store.tasks[0].status).toBe('TODO')
  })

  it('changes the status of a task that is not loaded without touching the list', async () => {
    vi.mocked(tasksApi.patchTask).mockResolvedValue({})

    await store.changeStatus(42, 'TODO')

    expect(tasksApi.patchTask).toHaveBeenCalledWith(42, { status: 'TODO' })
  })
})

describe('taskStore rules, loading and subtasks', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store = useTaskStore()
  })

  it('saves a normalized rule with string task ids', async () => {
    store.tasks = [{ task_id: 7 }]
    vi.mocked(tasksApi.updateCompletionRule).mockResolvedValue({})

    await store.saveCompletionRule(7, JSON.stringify(op('AND', leaf(1), { type: 'operator', operator: 'NOT' }, 'x')), true)

    const expected = op('AND', leaf('1'), { type: 'operator', operator: 'NOT', operands: [] }, 'x')
    expect(tasksApi.updateCompletionRule).toHaveBeenCalledWith(7, expected, true)
    expect(store.tasks[0]).toMatchObject({ completion_rule: expected, auto_complete: true })
  })

  it('saves no rule as null, keeps a leaf without id, and passes errors on', async () => {
    vi.mocked(tasksApi.updateCompletionRule).mockResolvedValueOnce({})
    await store.saveCompletionRule(7, null)
    expect(tasksApi.updateCompletionRule).toHaveBeenCalledWith(7, null, false)

    vi.mocked(tasksApi.updateCompletionRule).mockResolvedValueOnce({})
    await store.saveCompletionRule(7, { type: 'leaf' })
    expect(tasksApi.updateCompletionRule).toHaveBeenLastCalledWith(7, { type: 'leaf', task_id: undefined }, false)

    vi.mocked(tasksApi.updateCompletionRule).mockRejectedValueOnce(new Error('500'))
    await expect(store.saveCompletionRule(7, leaf(1))).rejects.toThrow('500')
  })

  it('ignores a second save while one is running', async () => {
    let finish
    vi.mocked(tasksApi.updateCompletionRule).mockImplementationOnce(() => new Promise((r) => (finish = r)))
    const first = store.saveCompletionRule(7, leaf(1))
    await store.saveCompletionRule(7, leaf(2))
    finish({})
    await first

    expect(tasksApi.updateCompletionRule).toHaveBeenCalledTimes(1)
  })

  it('loads one task and passes errors on', async () => {
    vi.mocked(tasksApi.fetchTaskById).mockResolvedValueOnce({ data: { task_id: 3 } })
    await expect(store.getTaskById(3)).resolves.toEqual({ task_id: 3 })

    vi.mocked(tasksApi.fetchTaskById).mockRejectedValueOnce(new Error('404'))
    await expect(store.getTaskById(3)).rejects.toThrow('404')
  })

  it('removes a task after its subtasks', async () => {
    store.tasks = [
      { task_id: 1, parent_task_id: null },
      { task_id: 2, parent_task_id: 1 },
      { task_id: 3, parent_task_id: 2 },
    ]
    vi.mocked(tasksApi.deleteTask).mockResolvedValue({})

    await store.removeTask(1)

    expect(vi.mocked(tasksApi.deleteTask).mock.calls.map(([id]) => id)).toEqual([3, 2, 1])
    expect(store.tasks).toEqual([])
  })

  it('creates subtasks with the deadline of the parent and defaults', async () => {
    vi.mocked(tasksApi.createTask)
      .mockResolvedValueOnce({ data: { task_id: 10 } })
      .mockResolvedValueOnce({ task_id: 11 })

    await store.createTaskWithSubtasks({ title: 'P', deadline: '2026-12-01' }, [{ title: 'S' }])

    expect(tasksApi.createTask).toHaveBeenLastCalledWith({
      title: 'S',
      parent_task_id: 10,
      deadline: '2026-12-01',
      description: '',
      status: 'TODO',
      progress: 0,
      priority_id: 2,
    })
  })

  it('passes an error while creating a task with subtasks on', async () => {
    vi.mocked(tasksApi.createTask).mockRejectedValueOnce(new Error('400'))

    await expect(store.createTaskWithSubtasks({ title: 'P' }, [])).rejects.toThrow('400')
  })

  it('edits a task with its subtasks: removes, changes and adds', async () => {
    store.tasks = [
      { task_id: 1, parent_task_id: null },
      { task_id: 2, parent_task_id: 1 },
      { task_id: 3, parent_task_id: 1 },
    ]
    vi.mocked(tasksApi.updateTask).mockImplementation((id, data) => Promise.resolve({ task_id: id, ...data }))
    vi.mocked(tasksApi.deleteTask).mockResolvedValue({})
    vi.mocked(tasksApi.createTask).mockResolvedValue({ task_id: 4, parent_task_id: 1 })

    const result = await store.editTaskWithSubtasks(1, { title: 'Neu', priority_id: 3 }, [
      { task_id: 2, title: 'Bleibt' },
      { title: 'Neu dazu' },
      { title: '  ' },
    ])

    expect(tasksApi.deleteTask).toHaveBeenCalledWith(3)
    expect(tasksApi.updateTask).toHaveBeenCalledWith(2, { task_id: 2, title: 'Bleibt' })
    expect(tasksApi.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Neu dazu', priority_id: 3 }))
    expect(result.subtasks).toHaveLength(2)
    expect(result.parentTask).toMatchObject({ task_id: 1, title: 'Neu' })
  })

  it('passes an error while editing with subtasks on', async () => {
    vi.mocked(tasksApi.updateTask).mockRejectedValueOnce({ response: { status: 403, data: {} } })

    await expect(store.editTaskWithSubtasks(1, {}, [])).rejects.toBeTruthy()
  })

  it('passes an error while removing on', async () => {
    vi.mocked(tasksApi.deleteTask).mockRejectedValueOnce(new Error('403'))

    await expect(store.removeTask(1)).rejects.toThrow('403')
  })
})
