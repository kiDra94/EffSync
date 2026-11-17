import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const documents = vi.hoisted(() => ({ fetchMyGrades: vi.fn() }))
vi.mock('@/stores/entities/documentStore', () => ({ useDocumentStore: () => documents }))

import GradesView from './GradesView.vue'

// UC-13 "Note einsehen" (UNUSED_CODE.md Planned, M27): the student's grades
describe('GradesView', () => {
  beforeEach(() => vi.clearAllMocks())

  it("lists the student's graded documents with grade and task", async () => {
    documents.fetchMyGrades.mockResolvedValue([
      { document_id: 3, name: 'Referat.pdf', grade: '2', task_title: 'Mathe Projekt', graded_at: '2026-11-02T10:00:00Z' },
    ])
    const wrapper = mount(GradesView)
    await flushPromises()

    const card = wrapper.find('.grade-card')
    expect(card.find('h3').text()).toBe('Referat.pdf')
    expect(card.find('.grade-value').text()).toBe('2')
    expect(card.text()).toContain('Mathe Projekt')
  })

  it('says so when there are no grades yet', async () => {
    documents.fetchMyGrades.mockResolvedValue([])
    const wrapper = mount(GradesView)
    await flushPromises()

    expect(wrapper.find('.empty-state').text()).toContain('Noch keine Bewertungen')
  })

  it('offers a retry when loading fails', async () => {
    documents.fetchMyGrades.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const wrapper = mount(GradesView)
    await flushPromises()

    await wrapper.find('.btn-retry').trigger('click')
    await flushPromises()

    expect(documents.fetchMyGrades).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })
})
