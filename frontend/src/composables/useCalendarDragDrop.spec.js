import { describe, it, expect, vi } from 'vitest'
import { useCalendarDragDrop } from './useCalendarDragDrop'

const dragEvent = () => ({ dataTransfer: { setData: vi.fn(), effectAllowed: '' } })

// M28: the calendar's drag-and-drop, out of CalendarView
describe('useCalendarDragDrop', () => {
  it('moves a dragged task to the day it is dropped on', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined)
    const drag = useCalendarDragDrop({ onMove })
    const event = dragEvent()

    drag.start({ id: 4, type: 'task' }, '2026-11-10', event)
    expect(event.dataTransfer.setData).toHaveBeenCalledWith('text/plain', '4')
    expect(event.dataTransfer.effectAllowed).toBe('move')
    drag.overDate('2026-11-12')
    expect(drag.dragOverDate.value).toBe('2026-11-12')
    await drag.dropOnDate('2026-11-12')

    expect(onMove).toHaveBeenCalledWith(4, '2026-11-10', '2026-11-12')
    expect(drag.draggedTask.value).toBeNull()
    expect(drag.dragOverDate.value).toBeNull()
  })

  it('ignores a drop on the same day and anything but tasks', async () => {
    const onMove = vi.fn()
    const drag = useCalendarDragDrop({ onMove })

    drag.start({ id: 4, type: 'task' }, '2026-11-10')
    await drag.dropOnDate('2026-11-10')
    drag.start({ id: 5, type: 'lesson' }, '2026-11-10')
    await drag.dropOnDate('2026-11-12')

    expect(onMove).not.toHaveBeenCalled()
  })

  it('marks a day only while something is dragged over it', () => {
    const drag = useCalendarDragDrop({ onMove: vi.fn() })

    drag.overDate('2026-11-12')
    expect(drag.dragOverDate.value).toBeNull()

    drag.start({ id: 4 }, '2026-11-10')
    drag.overDate('2026-11-12')
    drag.leaveDate('2026-11-11')
    expect(drag.dragOverDate.value).toBe('2026-11-12')
    drag.leaveDate('2026-11-12')
    expect(drag.dragOverDate.value).toBeNull()
  })

  it('moves by days relative to where the task came from', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined)
    const drag = useCalendarDragDrop({ onMove })

    drag.start({ id: 4, type: 'task' }, '2026-11-30')
    drag.overRelative(1)
    expect(drag.dragOverRelativeTarget.value).toBe(1)
    await drag.dropOnRelative(1)

    expect(onMove).toHaveBeenCalledWith(4, '2026-11-30', '2026-12-01')
    expect(drag.dragOverRelativeTarget.value).toBeNull()
  })

  it('ends the drag even when the move fails', async () => {
    const onMove = vi.fn().mockRejectedValue(new Error('403'))
    const drag = useCalendarDragDrop({ onMove })

    drag.start({ id: 4, type: 'task' }, '2026-11-10')
    await expect(drag.dropOnDate('2026-11-12')).rejects.toThrow('403')

    expect(drag.draggedTask.value).toBeNull()
  })
})
