import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useTaskFilters } from './useTaskFilters'

// T57 (M18): filter by status, priority, due date and text
describe('useTaskFilters', () => {
  afterEach(() => vi.useRealTimers())

  const tasks = ref([
    { task_id: 1, title: 'Mathe Test', status: 'TODO', priority_id: 4, deadline: '2026-11-07T10:00:00Z' },
    { task_id: 2, title: 'Englisch', status: 'IN_PROGRESS', priority_id: 2, deadline: '2026-11-08T15:00:00Z' },
    { task_id: 3, title: 'Projekt', status: 'TODO', priority_id: 3, deadline: '2026-11-12T08:00:00Z' },
    { task_id: 4, title: 'Referat', status: 'COMPLETED', priority_id: 1, deadline: '2026-11-01T08:00:00Z' },
    { task_id: 5, title: 'Ohne Termin', status: 'TODO', priority_id: 2, deadline: null },
  ])

  const filter = (options) => {
    const state = {
      searchQuery: ref(''),
      filterStatus: ref('all'),
      sortBy: ref('date'),
      filterPriority: ref('all'),
      filterDue: ref('all'),
      ...options,
    }
    const { filteredAndSorted } = useTaskFilters(
      tasks, state.searchQuery, state.filterStatus, state.sortBy,
      { filterPriority: state.filterPriority, filterDue: state.filterDue },
    )
    return filteredAndSorted.value.map((t) => t.task_id).sort()
  }

  it('filters by priority', () => {
    expect(filter({ filterPriority: ref(2) })).toEqual([2, 5])
    expect(filter({ filterPriority: ref('4') })).toEqual([1])
  })

  it('filters by due date: overdue, today, next 7 days, none', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-08T09:00:00Z'))

    // overdue: past deadline and not completed
    expect(filter({ filterDue: ref('overdue') })).toEqual([1])
    expect(filter({ filterDue: ref('today') })).toEqual([2])
    expect(filter({ filterDue: ref('week') })).toEqual([2, 3])
    expect(filter({ filterDue: ref('none') })).toEqual([5])
  })

  it('combines text, status, priority and due date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-08T09:00:00Z'))

    expect(
      filter({
        searchQuery: ref('pro'),
        filterStatus: ref('TODO'),
        filterPriority: ref(3),
        filterDue: ref('week'),
      }),
    ).toEqual([3])
  })

  it('keeps the old call without the new filters working', () => {
    const { filteredAndSorted } = useTaskFilters(tasks, ref(''), ref('all'), ref('date'))
    expect(filteredAndSorted.value).toHaveLength(5)
  })

  // review M18 (9): "Nächste 7 Tage" is today and the six days after it
  it('ends the 7-day window before the same weekday next week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-08T09:00:00'))
    const week = ref([
      { task_id: 1, title: 'A', status: 'TODO', deadline: '2026-11-14T23:00:00' },
      { task_id: 2, title: 'B', status: 'TODO', deadline: '2026-11-15T08:00:00' },
    ])

    const { filteredAndSorted } = useTaskFilters(week, ref(''), ref('all'), ref('date'), {
      filterDue: ref('week'),
    })
    expect(filteredAndSorted.value.map((t) => t.task_id)).toEqual([1])
  })
})
