// The time grid the week and day views share (M28, out of CalendarView)
import { formatDateKey } from '@/composables/useCalendarUtils';

/** Half-hour slots from 00:00 to 23:30. */
export const TIME_SLOTS = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
);

const SLOT_HEIGHT_PX = 30;
const DEFAULT_SCROLL_TIME = '07:30';

/** The tasks' colours by priority in the week and day views. */
const PRIORITY_COLORS = {
  1: '#34a853', // green
  2: '#fbbc04', // yellow
  3: '#ea4335', // red
  4: '#a142f4', // purple
};

/**
 * HH:MM of a lesson slot's time, given as an ISO date-time or a time; the
 * fallback without one, 08:00 for one that isn't text (as before M28).
 */
export function timeOfDay(isoTime, fallback) {
  if (!isoTime) return fallback;
  try {
    return isoTime.includes('T') ? isoTime.split('T')[1].substring(0, 5) : isoTime.substring(0, 5);
  } catch {
    return '08:00';
  }
}

/** Where a lesson sits in the grid: one slot per half hour. */
export function lessonStyle(lesson) {
  const [startHour, startMin] = lesson.startTime.split(':').map(Number);
  const [endHour, endMin] = lesson.endTime.split(':').map(Number);
  const startIdx = TIME_SLOTS.findIndex((t) => t === lesson.startTime);
  const duration = endHour * 60 + endMin - (startHour * 60 + startMin);
  return {
    top: startIdx * SLOT_HEIGHT_PX + 'px',
    height: (duration / 30) * SLOT_HEIGHT_PX + 'px',
  };
}

/**
 * Scrolls a timetable to the school morning (07:30); the day headers sit
 * above it since the manual check of M28.
 */
export function scrollToDefaultTime(element) {
  if (!element) return;
  const slotIndex = TIME_SLOTS.indexOf(DEFAULT_SCROLL_TIME);
  element.scrollTop = Math.max(0, slotIndex * SLOT_HEIGHT_PX - 8);
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * A day's open tasks for the week and day views (T60: by due date), by the
 * local date of the deadline like the month view (review M28: the week view
 * took the deadline's UTC date), earliest first, with the time unless it is
 * midnight (a deadline without a time).
 */
export function tasksOnDay(tasks, dateKey) {
  return tasks
    .filter((task) => task.deadline && formatDateKey(task.deadline) === dateKey)
    .map((task) => ({ task, deadline: new Date(task.deadline) }))
    .sort((a, b) => a.deadline - b.deadline)
    .map(({ task, deadline }) => ({
      id: task.task_id ?? task.id,
      date: dateKey,
      title: task.title,
      time: deadline.getHours() || deadline.getMinutes() ? `${pad(deadline.getHours())}:${pad(deadline.getMinutes())}` : '',
      color: PRIORITY_COLORS[task.priority_id] || '#4f46e5',
      description: task.description,
      status: task.status,
      type: 'task',
    }));
}
