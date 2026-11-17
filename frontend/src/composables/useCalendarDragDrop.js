import { ref } from 'vue';
import { shiftDateKey } from '@/composables/useCalendarUtils';

/**
 * The calendar's drag-and-drop (M28, out of CalendarView): a task is dragged
 * from its day onto another day, or onto the day view's arrows (a day earlier
 * or later). `onMove(taskId, sourceDateKey, targetDateKey)` does the move.
 */
export function useCalendarDragDrop({ onMove }) {
  const draggedTask = ref(null);
  const dragOverDate = ref(null);
  const dragOverRelativeTarget = ref(null);

  function start(taskLike, sourceDateKey, dragEvent = null) {
    const taskId = taskLike?.id ?? taskLike?.task_id;
    if (!taskId || (taskLike.type ?? 'task') !== 'task') return;

    draggedTask.value = { id: taskId, sourceDateKey };
    if (dragEvent?.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = 'move';
      dragEvent.dataTransfer.setData('text/plain', String(taskId));
    }
  }

  function end() {
    draggedTask.value = null;
    dragOverDate.value = null;
    dragOverRelativeTarget.value = null;
  }

  function overDate(dateKey) {
    if (draggedTask.value && dateKey) dragOverDate.value = dateKey;
  }

  function leaveDate(dateKey) {
    if (dragOverDate.value === dateKey) dragOverDate.value = null;
  }

  async function dropOnDate(dateKey) {
    if (!draggedTask.value || !dateKey) return;
    const { id, sourceDateKey } = draggedTask.value;
    try {
      if (sourceDateKey !== dateKey) await onMove(id, sourceDateKey, dateKey);
    } finally {
      end();
    }
  }

  function overRelative(offsetDays) {
    if (draggedTask.value) dragOverRelativeTarget.value = offsetDays;
  }

  function leaveRelative(offsetDays) {
    if (dragOverRelativeTarget.value === offsetDays) dragOverRelativeTarget.value = null;
  }

  function dropOnRelative(offsetDays) {
    if (!draggedTask.value) return;
    const target = shiftDateKey(draggedTask.value.sourceDateKey, offsetDays);
    if (!target) {
      end();
      return;
    }
    return dropOnDate(target);
  }

  return {
    draggedTask,
    dragOverDate,
    dragOverRelativeTarget,
    start,
    end,
    overDate,
    leaveDate,
    dropOnDate,
    overRelative,
    leaveRelative,
    dropOnRelative,
  };
}
