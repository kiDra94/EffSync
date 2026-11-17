import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const api = vi.hoisted(() => ({
  fetchMetrics: vi.fn(),
  fetchDocuments: vi.fn(),
  fetchAllLessonSlots: vi.fn(),
  classes: vi.fn(),
  departments: vi.fn(),
  subjects: vi.fn(),
  rooms: vi.fn(),
}))
vi.mock('@/api/metrics', () => ({ fetchMetrics: api.fetchMetrics }))
vi.mock('@/api/documents', () => ({ fetchDocuments: api.fetchDocuments }))
vi.mock('@/api/lessonSlots', () => ({ fetchAllLessonSlots: api.fetchAllLessonSlots }))
vi.mock('@/api/schoolOrganization', () => ({
  classesApi: { list: api.classes },
  departmentsApi: { list: api.departments },
  subjectsApi: { list: api.subjects },
  roomsApi: { list: api.rooms },
}))

import { useMetricsStore } from './metricsStore'

// FA-30 to FA-35 (M24), M25 step 1: the dashboard's data through a store
describe('metricsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    api.fetchMetrics.mockResolvedValue({ openTasks: 4, totalTasks: 9, completedTasks: 5 })
    api.fetchDocuments.mockResolvedValue([{ added_by: 3 }, { added_by: 7 }, { added_by: 3 }])
    api.fetchAllLessonSlots.mockResolvedValue({ data: [{}, {}] })
    api.classes.mockResolvedValue([{}])
    api.departments.mockResolvedValue([{}, {}])
    api.subjects.mockResolvedValue([{}, {}, {}])
    api.rooms.mockResolvedValue([{}, {}, {}, {}])
  })

  it('reads one metric with its parameters', async () => {
    api.fetchMetrics.mockResolvedValue({ labels: [] })

    await expect(useMetricsStore().getMetric('trends', { period: 'week' })).resolves.toEqual({ labels: [] })
    expect(api.fetchMetrics).toHaveBeenCalledWith('trends', { period: 'week' })
  })

  it('counts the dashboard tiles in parallel, own documents only', async () => {
    const counts = await useMetricsStore().loadDashboardCounts({ userId: 3, isAdmin: true })

    expect(counts).toEqual({
      openTasks: 4,
      classes: 1,
      ownDocuments: 2,
      lessonSlots: 2,
      departments: 2,
      subjects: 3,
      rooms: 4,
    })
  })

  it("leaves out the admin's tiles for others and survives a failed request", async () => {
    api.fetchDocuments.mockRejectedValue(new Error('offline'))
    api.fetchMetrics.mockRejectedValue(new Error('offline'))

    const counts = await useMetricsStore().loadDashboardCounts({ userId: 3, isAdmin: false })

    expect(api.subjects).not.toHaveBeenCalled()
    expect(api.rooms).not.toHaveBeenCalled()
    expect(counts).toMatchObject({ openTasks: null, ownDocuments: 0, subjects: 0, rooms: 0, classes: 1 })
  })
})
