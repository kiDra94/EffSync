import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

const store = reactive({
  entries: [],
  meta: { total: 0, page: 1, totalPages: 1 },
  error: '',
  loading: false,
  load: vi.fn(),
})
vi.mock('@/stores/entities/auditLogStore', () => ({ useAuditLogStore: () => store }))

import AuditLogView from './AuditLogView.vue'

// T33, UC-32 (M27): who did what to which task, deleted tasks included
describe('AuditLogView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.error = ''
    store.entries = [
      {
        log_id: 2, task_id: 5, action: 'Task updated: "Mathe"', timestamp: '2026-11-09T09:00:00Z',
        users: { firstname: 'Anna', lastname: 'Lehrer', email: 'anna@htl.at' },
      },
      {
        log_id: 1, task_id: null, action: 'Task deleted: "Alt"', timestamp: '2026-11-08T09:00:00Z',
        users: { firstname: 'Felix', lastname: 'Fuchs', email: 'felix@htl.at' },
      },
    ]
    store.meta = { total: 2, page: 1, totalPages: 1 }
  })

  it('loads the newest entries and lists who did what to which task', async () => {
    const wrapper = mount(AuditLogView)
    await flushPromises()

    expect(store.load).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Anna Lehrer')
    expect(rows[0].text()).toContain('Task updated: "Mathe"')
    expect(rows[0].text()).toContain('#5')
  })

  it('shows a deleted task by its text, without a task number', async () => {
    const wrapper = mount(AuditLogView)
    await flushPromises()

    const deleted = wrapper.findAll('tbody tr')[1]
    expect(deleted.text()).toContain('Task deleted: "Alt"')
    expect(deleted.text()).toContain('gelöscht')
  })

  it('filters by action and date', async () => {
    const wrapper = mount(AuditLogView)
    await flushPromises()

    await wrapper.find('input[name="action"]').setValue('deleted')
    await wrapper.find('input[name="from"]').setValue('2026-11-01')
    await wrapper.find('form').trigger('submit')

    expect(store.load).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'deleted', from: '2026-11-01', page: 1 }),
    )
  })

  // review M27: paging keeps the filter that was applied, not the unsent inputs
  it('pages through the applied filter only', async () => {
    store.meta = { total: 120, page: 1, totalPages: 3 }
    const wrapper = mount(AuditLogView)
    await flushPromises()

    await wrapper.find('input[name="action"]').setValue('deleted')
    await wrapper.find('form').trigger('submit')
    await wrapper.find('input[name="action"]').setValue('created')
    await wrapper.find('.pager button:last-child').trigger('click')

    expect(store.load).toHaveBeenLastCalledWith({ action: 'deleted', from: '', to: '', page: 2 })
  })

  it('shows the error instead of the table', async () => {
    store.error = 'Das Audit-Log ist nur für Administratoren.'
    const wrapper = mount(AuditLogView)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('nur für Administratoren')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})
