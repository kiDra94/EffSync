import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const handlers = vi.hoisted(() => ({}))
vi.mock('@/api/tasks')
vi.mock('../useSocket', () => ({
  useSocket: () => ({
    socket_on: (event, handler) => { handlers[event] = handler },
    socket_off: vi.fn(),
  }),
}))

import { useTaskStore } from './taskStore'
import * as tasksApi from '@/api/tasks'

// review M16: the realtime event carries only the task row, without its
// relations, so the store merges it instead of replacing the cached task
describe('taskStore task:updated', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps the cached relations when a task:updated event arrives', async () => {
    const store = useTaskStore()
    vi.mocked(tasksApi.fetchTasks).mockResolvedValue([
      {
        task_id: 1,
        title: 'Projekt',
        status: 'IN_PROGRESS',
        task_members: [{ user_id: 7 }],
        priorities: { name: 'Hoch' },
      },
    ])
    await store.getTasks()

    handlers['task:updated']({ task_id: 1, title: 'Projekt', status: 'COMPLETED', progress: 100 })

    expect(store.tasks[0]).toMatchObject({
      status: 'COMPLETED',
      progress: 100,
      task_members: [{ user_id: 7 }],
      priorities: { name: 'Hoch' },
    })
  })
})
