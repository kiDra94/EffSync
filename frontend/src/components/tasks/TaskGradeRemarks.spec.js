import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const store = vi.hoisted(() => ({ fetchGradeRemarks: vi.fn(), addGradeRemark: vi.fn() }))
vi.mock('@/stores/entities/taskCommentStore', () => ({ useTaskCommentStore: () => store }))

import TaskGradeRemarks from './TaskGradeRemarks.vue'

const anna = { user_id: 2, firstname: 'Anna', lastname: 'Lehrer' }

// T74, decision Q16 (M27): the teachers' grading remarks in the task detail view
describe('TaskGradeRemarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.fetchGradeRemarks.mockResolvedValue([
      { comment_id: 1, text: 'Saubere Gliederung', created_at: '2026-11-09T09:00:00Z', users: anna },
    ])
  })

  it('lists the remarks with their author', async () => {
    const wrapper = mount(TaskGradeRemarks, { props: { taskId: 7, canWrite: false } })
    await flushPromises()

    expect(store.fetchGradeRemarks).toHaveBeenCalledWith(7)
    expect(wrapper.find('.remark-item').text()).toContain('Saubere Gliederung')
    expect(wrapper.find('.remark-item').text()).toContain('Anna Lehrer')
  })

  it('has no form for students', async () => {
    const wrapper = mount(TaskGradeRemarks, { props: { taskId: 7, canWrite: false } })
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('lets a teacher write a remark', async () => {
    store.addGradeRemark.mockResolvedValue({
      comment_id: 2, text: 'Quellen fehlen', created_at: '2026-11-10T09:00:00Z', users: anna,
    })
    const wrapper = mount(TaskGradeRemarks, { props: { taskId: 7, canWrite: true } })
    await flushPromises()

    await wrapper.find('textarea').setValue('Quellen fehlen')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.addGradeRemark).toHaveBeenCalledWith(7, 'Quellen fehlen')
    expect(wrapper.findAll('.remark-item')).toHaveLength(2)
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('stays hidden for a user who may not read the remarks (403)', async () => {
    store.fetchGradeRemarks.mockRejectedValue({ response: { status: 403 } })
    const wrapper = mount(TaskGradeRemarks, { props: { taskId: 7, canWrite: false } })
    await flushPromises()

    expect(wrapper.find('.grade-remarks').exists()).toBe(false)
  })

  it('shows a message when saving fails', async () => {
    store.addGradeRemark.mockRejectedValue(new Error('offline'))
    const wrapper = mount(TaskGradeRemarks, { props: { taskId: 7, canWrite: true } })
    await flushPromises()

    await wrapper.find('textarea').setValue('Quellen fehlen')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.remarks-error').text()).toBe('Die Anmerkung konnte nicht gespeichert werden.')
  })
})
