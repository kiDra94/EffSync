import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const store = vi.hoisted(() => ({ fetchComments: vi.fn(), addComment: vi.fn() }))
vi.mock('@/stores/entities/taskCommentStore', () => ({ useTaskCommentStore: () => store }))

import TaskComments from './TaskComments.vue'

const anna = { user_id: 2, firstname: 'Anna', lastname: 'Lehrer' }

// T09, T74, decision Q16 (M27): the comment section of the task detail view
describe('TaskComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.fetchComments.mockResolvedValue([
      { comment_id: 1, content: 'Bitte ansehen @ffuchs', created_at: '2026-11-09T09:00:00Z', users: anna },
    ])
  })

  it('lists the comments with author and the @mention marked', async () => {
    const wrapper = mount(TaskComments, { props: { taskId: 7 } })
    await flushPromises()

    expect(store.fetchComments).toHaveBeenCalledWith(7)
    const item = wrapper.find('.comment-item')
    expect(item.text()).toContain('Anna Lehrer')
    expect(item.text()).toContain('Bitte ansehen @ffuchs')
    expect(item.find('.mention').text()).toBe('@ffuchs')
  })

  it('shows a hint when there are no comments yet', async () => {
    store.fetchComments.mockResolvedValue([])
    const wrapper = mount(TaskComments, { props: { taskId: 7 } })
    await flushPromises()

    expect(wrapper.find('.comments-empty').exists()).toBe(true)
  })

  it('writes a comment and adds it to the list', async () => {
    store.addComment.mockResolvedValue({
      comment_id: 2, content: 'Danke @alehrerin', created_at: '2026-11-10T09:00:00Z', users: anna,
    })
    const wrapper = mount(TaskComments, { props: { taskId: 7 } })
    await flushPromises()

    await wrapper.find('textarea').setValue('  Danke @alehrerin  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.addComment).toHaveBeenCalledWith(7, 'Danke @alehrerin')
    expect(wrapper.findAll('.comment-item')).toHaveLength(2)
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('does not send an empty comment', async () => {
    const wrapper = mount(TaskComments, { props: { taskId: 7 } })
    await flushPromises()

    await wrapper.find('textarea').setValue('   ')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(store.addComment).not.toHaveBeenCalled()
  })

  it('keeps the text and shows a message when sending fails', async () => {
    store.addComment.mockRejectedValue(new Error('offline'))
    const wrapper = mount(TaskComments, { props: { taskId: 7 } })
    await flushPromises()

    await wrapper.find('textarea').setValue('Hallo')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.comments-error').text()).toBe('Der Kommentar konnte nicht gespeichert werden.')
    expect(wrapper.find('textarea').element.value).toBe('Hallo')
  })

  it('shows a message when loading fails', async () => {
    store.fetchComments.mockRejectedValue(new Error('offline'))
    const wrapper = mount(TaskComments, { props: { taskId: 7 } })
    await flushPromises()

    expect(wrapper.find('.comments-error').text()).toBe('Die Kommentare konnten nicht geladen werden.')
  })
})
