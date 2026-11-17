import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const taskStore = vi.hoisted(() => ({ unlockWithDeadline: vi.fn() }))
vi.mock('@/stores/entities/taskStore', () => ({ useTaskStore: () => taskStore }))

import TaskLockNotice from './TaskLockNotice.vue'

// Feature #27 (Definition of done: out of TaskForm): why a task is locked, and the unlock
describe('TaskLockNotice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('names the reason of the lock', () => {
    const reason = (task) => mount(TaskLockNotice, { props: { task } }).find('.lock-warning').text()

    expect(reason({ task_id: 1, locked_reason: 'OVERDUE' })).toContain('Überfällig - automatisch gesperrt')
    expect(reason({ task_id: 1, locked_reason: 'MANUAL' })).toContain('Manuell gesperrt')
    expect(reason({ task_id: 1, is_student_submission_locked: true, student_submission_status: { latest_grade: '2' } }))
      .toContain('Deine Eingabe wurde bewertet (2)')
  })

  it('offers no unlock to anyone but the creator', () => {
    const wrapper = mount(TaskLockNotice, { props: { task: { task_id: 1 }, canUnlock: false } })

    expect(wrapper.find('.btn-unlock-small').exists()).toBe(false)
  })

  it('unlocks with the new deadline and tells the form', async () => {
    taskStore.unlockWithDeadline.mockResolvedValue(undefined)
    const wrapper = mount(TaskLockNotice, { props: { task: { task_id: 7, locked_reason: 'MANUAL' }, canUnlock: true } })

    await wrapper.find('.btn-unlock-small').trigger('click')
    await wrapper.find('#unlock-deadline').setValue('2026-12-01T10:00')
    await wrapper.find('.unlock-dialog .btn-primary').trigger('click')
    await flushPromises()

    expect(taskStore.unlockWithDeadline).toHaveBeenCalledWith(7, '2026-12-01T10:00:00.000Z')
    expect(wrapper.emitted('unlocked')).toHaveLength(1)
    expect(wrapper.find('.unlock-dialog').exists()).toBe(false)
  })

  it('asks for a deadline before unlocking', async () => {
    const wrapper = mount(TaskLockNotice, { props: { task: { task_id: 7 }, canUnlock: true } })

    await wrapper.find('.btn-unlock-small').trigger('click')
    await wrapper.find('.unlock-dialog .btn-primary').trigger('click')

    expect(window.alert).toHaveBeenCalledWith('Bitte wähle ein neues Deadline-Datum aus.')
    expect(taskStore.unlockWithDeadline).not.toHaveBeenCalled()
  })
})
