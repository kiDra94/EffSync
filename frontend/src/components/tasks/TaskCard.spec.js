import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskCard from './TaskCard.vue'

const { push, openTaskChat } = vi.hoisted(() => ({
  push: vi.fn(),
  openTaskChat: vi.fn().mockResolvedValue({ room_id: 12 }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/stores/entities/chatStore', () => ({ useChatStore: () => ({ openTaskChat }) }))
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

// T59 (M18, decision Q8e): the task's tags as chips
describe('TaskCard tags', () => {
  it('shows the tags as chips', () => {
    const wrapper = mount(TaskCard, {
      props: {
        task: {
          task_id: 1, title: 'Referat', priority_id: 2, status: 'TODO', progress: 0,
          task_tags: [{ tags: { tag_id: 1, name: 'mathe' } }, { tags: { tag_id: 2, name: 'projekt' } }],
        },
      },
      global: { stubs: { RuleVisualizer: true } },
    })

    expect(wrapper.findAll('.tag-chip').map((chip) => chip.text())).toEqual(['#mathe', '#projekt'])
  })
})

// GOALS.md M21 (T29): the task's chat opens from the card, with task_id set
describe('TaskCard chat', () => {
  it('opens the task chat and shows it in the chat view', async () => {
    const wrapper = mount(TaskCard, {
      props: { task: { task_id: 7, title: 'Referat', priority_id: 2, status: 'TODO', progress: 0 } },
      global: { stubs: { RuleVisualizer: true } },
    })

    await wrapper.find('button.task-btn-chat').trigger('click')
    await Promise.resolve()
    await Promise.resolve()

    expect(openTaskChat).toHaveBeenCalledWith(7)
    expect(push).toHaveBeenCalledWith({ name: 'Chat', query: { room: '12' } })
  })
})
