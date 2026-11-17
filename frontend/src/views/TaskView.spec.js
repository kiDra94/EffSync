import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'

const route = reactive({ query: {} })
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push: vi.fn() }) }))
const taskStore = reactive({
  tasks: [],
  getTasks: vi.fn(),
})
vi.mock('@/stores/entities/taskStore', () => ({ useTaskStore: () => taskStore }))

import TaskView from './TaskView.vue'

// M26 (T42): a search result opens its project or task: /tasks?task=<id>
describe('TaskView opened from the search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    taskStore.tasks = [
      { task_id: 1, title: 'Mathe Projekt', parent_task_id: null },
      { task_id: 2, title: 'Mathe Kapitel 1', parent_task_id: 1 },
    ]
  })

  const formTask = (wrapper) => wrapper.findComponent({ name: 'TaskForm' })

  it('opens the task named in the address', async () => {
    route.query = { task: '2' }
    const wrapper = shallowMount(TaskView)
    await flushPromises()

    expect(formTask(wrapper).exists()).toBe(true)
    expect(formTask(wrapper).props('task')).toMatchObject({ task_id: 2 })
  })

  it('opens the next one when the search picks another task here', async () => {
    const wrapper = shallowMount(TaskView)
    await flushPromises()
    expect(formTask(wrapper).exists()).toBe(false)

    route.query = { task: '1' }
    await nextTick()

    expect(formTask(wrapper).props('task')).toMatchObject({ task_id: 1 })
  })
})
