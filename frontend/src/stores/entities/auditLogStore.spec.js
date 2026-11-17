import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const activityApi = vi.hoisted(() => ({ fetchAuditLog: vi.fn() }))
vi.mock('@/api/activityLog', () => activityApi)

import { useAuditLogStore } from './auditLogStore'

// T33, UC-32 (M27): the admin's view of the activity log
describe('auditLogStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    activityApi.fetchAuditLog.mockResolvedValue({
      data: [{ log_id: 9, action: 'Task deleted: "Alt"', task_id: null }],
      meta: { total: 51, page: 2, limit: 50, totalPages: 2 },
    })
  })

  it('loads a page with the filters that are set', async () => {
    const store = useAuditLogStore()

    await store.load({ action: 'deleted', from: '', page: 2 })

    expect(activityApi.fetchAuditLog).toHaveBeenCalledWith({ action: 'deleted', page: 2, limit: 50 })
    expect(store.entries).toEqual([{ log_id: 9, action: 'Task deleted: "Alt"', task_id: null }])
    expect(store.meta).toMatchObject({ total: 51, page: 2, totalPages: 2 })
  })

  it('keeps an error message when loading fails', async () => {
    activityApi.fetchAuditLog.mockRejectedValue({ response: { status: 403 } })
    const store = useAuditLogStore()

    await store.load({})

    expect(store.entries).toEqual([])
    expect(store.error).toBe('Das Audit-Log ist nur für Administratoren.')
  })
})
