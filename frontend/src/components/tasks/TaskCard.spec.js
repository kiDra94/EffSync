import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskCard from './TaskCard.vue'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/entities/taskStore', () => ({
  useTaskStore: () => ({ getSubtasks: () => [], tasks: [], isLogicFulfilled: () => null }),
}))

// T100 (M16): a task is COMPLETED only at 100 %, so the checkbox and the
// "Fertig" status are blocked until then
describe('TaskCard completion checkbox', () => {
  const mountCard = (task) =>
    mount(TaskCard, {
      props: { task: { task_id: 1, title: 'Referat', priority_id: 2, ...task } },
      global: { stubs: { RuleVisualizer: true } },
    })

  it('blocks the checkbox and "Fertig" below 100 %', async () => {
    const wrapper = mountCard({ status: 'IN_PROGRESS', progress: 40 })

    const checkbox = wrapper.find('input.task-checkbox')
    expect(checkbox.attributes('disabled')).toBeDefined()
    expect(checkbox.attributes('title')).toContain('100 %')
    expect(wrapper.find('option[value="COMPLETED"]').attributes('disabled')).toBeDefined()

    await checkbox.trigger('change')
    expect(wrapper.emitted('toggle-status')).toBeUndefined()
  })

  it('allows completing at 100 %', async () => {
    const wrapper = mountCard({ status: 'IN_PROGRESS', progress: 100 })

    const checkbox = wrapper.find('input.task-checkbox')
    expect(checkbox.attributes('disabled')).toBeUndefined()
    expect(wrapper.find('option[value="COMPLETED"]').attributes('disabled')).toBeUndefined()

    await checkbox.trigger('change')
    expect(wrapper.emitted('toggle-status')).toHaveLength(1)
  })

  it('keeps a completed task reopenable', () => {
    const wrapper = mountCard({ status: 'COMPLETED', progress: 100 })

    expect(wrapper.find('input.task-checkbox').attributes('disabled')).toBeUndefined()
  })
})
