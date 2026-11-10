import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

const taskStore = vi.hoisted(() => ({
  tasks: [],
  getTasks: vi.fn(),
  moveDeadline: vi.fn(),
  editTask: vi.fn(),
  addTask: vi.fn(),
  editTaskWithSubtasks: vi.fn(),
}))
// reactive like the real store, so the views follow its changes
vi.mock('@/stores/entities/taskStore', async () => {
  const { reactive } = await vi.importActual('vue')
  const store = reactive(taskStore)
  return { useTaskStore: () => store }
})
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => reactive({ userId: 1 }) }))
const lessonSlotStore = vi.hoisted(() => ({ fetchAll: vi.fn() }))
vi.mock('@/stores/entities/lessonSlotStore', () => ({ useLessonSlotStore: () => lessonSlotStore }))

import CalendarView from './CalendarView.vue'
import { useTaskStore } from '@/stores/entities/taskStore'

const TASKS = [
  { task_id: 1, title: 'Mathe-Abgabe', deadline: '2026-11-10T14:30:00', status: 'TODO', priority_id: 2, created_by: 1 },
  { task_id: 2, title: 'Englisch-Referat', deadline: '2026-11-20T09:00:00', status: 'IN_PROGRESS', priority_id: 3, created_by: 1 },
  { task_id: 3, title: 'Erledigt', deadline: '2026-11-10T08:00:00', status: 'COMPLETED', priority_id: 1, created_by: 1 },
]
const LESSONS = [
  { slot_id: 7, day_of_week: 1, start_time: '1970-01-01T08:00:00.000Z', end_time: '1970-01-01T08:50:00.000Z', subject_id: 3, room: { name: 'R101' } },
]
const stubs = { TaskForm: { name: 'TaskForm', props: ['task'], template: '<div class="task-form-stub" />' } }

const mountCalendar = async () => {
  const wrapper = mount(CalendarView, { global: { stubs }, attachTo: document.body })
  await flushPromises()
  return wrapper
}
const show = async (wrapper, mode) => {
  await wrapper.find('#view-mode-select').setValue(mode)
  await flushPromises()
}
const dataTransfer = () => ({ setData: vi.fn(), effectAllowed: '' })
const dayCell = (wrapper, day) =>
  wrapper.findAll('.day-cell:not(.is-padding)').find((cell) => cell.find('.day-number').text() === day)

// M28 (T60): the smoke test before CalendarView is split, for every view and
// the drag-and-drop moves
describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    // Tuesday, 10 November 2026
    vi.setSystemTime(new Date(2026, 10, 10, 10, 0, 0))
    taskStore.tasks = TASKS.map((task) => ({ ...task }))
    taskStore.getTasks.mockResolvedValue(undefined)
    taskStore.moveDeadline.mockResolvedValue(undefined)
    lessonSlotStore.fetchAll.mockResolvedValue(LESSONS)
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('opens on the month with the open tasks on their days', async () => {
    const wrapper = await mountCalendar()

    expect(wrapper.find('.cal-header h2').text()).toBe('November 2026')
    const today = wrapper.find('.day-cell.is-today')
    expect(today.find('.day-number').text()).toBe('10')
    expect(today.text()).toContain('Mathe-Abgabe')
    // completed tasks stay out of the calendar
    expect(wrapper.text()).not.toContain('Erledigt')
  })

  it('pages through the months', async () => {
    const wrapper = await mountCalendar()

    await wrapper.findAll('.cal-header .nav-btn')[1].trigger('click')
    expect(wrapper.find('.cal-header h2').text()).toBe('Dezember 2026')
    await wrapper.find('.btn-today').trigger('click')
    expect(wrapper.find('.cal-header h2').text()).toBe('November 2026')
  })

  it('shows the year with twelve months and opens one of them', async () => {
    const wrapper = await mountCalendar()
    await show(wrapper, 'year')

    expect(wrapper.find('.cal-header h2').text()).toBe('2026')
    const months = wrapper.findAll('.year-month-card')
    expect(months).toHaveLength(12)
    expect(months[10].classes()).toContain('is-current')
    expect(months[10].findAll('.mini-day-cell.has-task')).toHaveLength(2)

    await months[2].trigger('click')
    expect(wrapper.find('#view-mode-select').element.value).toBe('month')
    expect(wrapper.find('.cal-header h2').text()).toBe('März 2026')
  })

  it('shows the week from Monday with lessons and tasks', async () => {
    const wrapper = await mountCalendar()
    await show(wrapper, 'week')

    expect(wrapper.find('.week-header h2').text()).toBe('9.11.2026 - 15.11.2026')
    const days = wrapper.findAll('.days-header .day-header-cell')
    expect(days.map((d) => d.find('.day-date').text())).toEqual(['9', '10', '11', '12', '13', '14', '15'])
    expect(days[1].classes()).toContain('is-today')
    expect(wrapper.find('.lesson-card').text()).toContain('R101')
    expect(wrapper.findAll('.day-tasks')[1].text()).toContain('Mathe-Abgabe')
  })

  // manual check M28: the tasks sat under the 24-hour grid, out of sight;
  // now they are in a row under the day headers, above the scrolling grid
  it('shows the week\'s tasks with their time above the time grid', async () => {
    const wrapper = await mountCalendar()
    await show(wrapper, 'week')

    const top = wrapper.find('.timetable-top')
    expect(top.find('.days-header').exists()).toBe(true)
    const tuesday = top.findAll('.tasks-row .day-tasks')[1]
    expect(tuesday.find('.task-time').text()).toBe('14:30')
    expect(tuesday.find('.task-title').text()).toBe('Mathe-Abgabe')
    expect(wrapper.find('.timetable-container .tasks-row').exists()).toBe(false)
  })

  // the week view filed a task by the UTC date of its deadline (review M28)
  it('files a task by its local date in every view', async () => {
    // 12 November, 00:30 local time: on the 11th in UTC wherever the clock is
    // ahead of UTC (Vienna: 2026-11-11T23:30Z), the case that went wrong
    const deadline = new Date(2026, 10, 12, 0, 30).toISOString()
    taskStore.tasks = [{ task_id: 5, title: 'Mitternacht', deadline, status: 'TODO', priority_id: 2, created_by: 1 }]
    const wrapper = await mountCalendar()
    expect(dayCell(wrapper, '12').text()).toContain('Mitternacht')

    await show(wrapper, 'week')
    const columns = wrapper.findAll('.day-tasks').map((c) => c.text())
    expect(columns[3]).toContain('Mitternacht')
    expect(columns[2]).not.toContain('Mitternacht')
  })

  it('shows one day and steps to the next', async () => {
    const wrapper = await mountCalendar()
    await show(wrapper, 'day')

    expect(wrapper.find('.week-header h2').text()).toBe('10.11.2026')
    expect(wrapper.findAll('.day-header-cell')).toHaveLength(1)
    // manual check M28: in sight above the grid, with the time
    const tasks = wrapper.find('.timetable-top .tasks-row')
    expect(tasks.find('.task-time').text()).toBe('14:30')
    expect(tasks.find('.task-title').text()).toBe('Mathe-Abgabe')

    await wrapper.findAll('.week-header .nav-btn')[1].trigger('click')
    expect(wrapper.find('.week-header h2').text()).toBe('11.11.2026')
  })

  it('opens a task in the form on click', async () => {
    const wrapper = await mountCalendar()

    await wrapper.find('.day-cell.is-today .event-box').trigger('click')

    expect(wrapper.findComponent({ name: 'TaskForm' }).props('task')).toMatchObject({ task_id: 1 })
  })

  // review M28: the month view follows the store, so a save shows at once
  it('shows a task saved in the form without a reload', async () => {
    const store = useTaskStore()
    taskStore.editTask.mockImplementation(async (id, data) => {
      store.tasks = store.tasks.map((t) => (t.task_id === id ? { ...t, ...data } : t))
    })
    const wrapper = await mountCalendar()
    await wrapper.find('.day-cell.is-today .event-box').trigger('click')

    wrapper.findComponent({ name: 'TaskForm' }).vm.$emit('save', { task_id: 1, title: 'Mathe-Abgabe (neu)', deadline: '2026-11-12T14:30:00' })
    await flushPromises()

    expect(dayCell(wrapper, '12').text()).toContain('Mathe-Abgabe (neu)')
    expect(wrapper.find('.day-cell.is-today').text()).not.toContain('Mathe-Abgabe')
  })

  it('moves a task to another day in the month, keeping its time', async () => {
    const wrapper = await mountCalendar()
    const target = dayCell(wrapper, '12')

    await wrapper.find('.day-cell.is-today .event-box').trigger('dragstart', { dataTransfer: dataTransfer() })
    await target.trigger('dragover')
    expect(target.classes()).toContain('drag-over')
    await target.trigger('drop')
    await flushPromises()

    expect(taskStore.moveDeadline).toHaveBeenCalledWith(1, new Date(2026, 10, 12, 14, 30, 0).toISOString())
    expect(taskStore.getTasks).toHaveBeenCalledTimes(2)
  })

  it('moves a task in the week view', async () => {
    const wrapper = await mountCalendar()
    await show(wrapper, 'week')

    await wrapper.findAll('.day-tasks')[1].find('.task-card').trigger('dragstart', { dataTransfer: dataTransfer() })
    await wrapper.findAll('.day-tasks')[3].trigger('drop')
    await flushPromises()

    expect(taskStore.moveDeadline).toHaveBeenCalledWith(1, new Date(2026, 10, 12, 14, 30, 0).toISOString())
  })

  it('moves a task to the next day by dropping it on the arrow in the day view', async () => {
    const wrapper = await mountCalendar()
    await show(wrapper, 'day')

    await wrapper.find('.tasks-row .task-card').trigger('dragstart', { dataTransfer: dataTransfer() })
    await wrapper.findAll('.week-header .nav-btn')[1].trigger('drop')
    await flushPromises()

    expect(taskStore.moveDeadline).toHaveBeenCalledWith(1, new Date(2026, 10, 11, 14, 30, 0).toISOString())
  })

  it("refuses to move a graded submission of someone else's task", async () => {
    taskStore.tasks[0] = { ...taskStore.tasks[0], created_by: 2, is_student_submission_locked: true }
    const wrapper = await mountCalendar()
    const target = dayCell(wrapper, '12')

    await wrapper.find('.day-cell.is-today .event-box').trigger('dragstart', { dataTransfer: dataTransfer() })
    await target.trigger('drop')
    await flushPromises()

    expect(taskStore.moveDeadline).not.toHaveBeenCalled()
    expect(wrapper.find('.error-banner').text()).toContain('nicht mehr verschieben')
  })
})
