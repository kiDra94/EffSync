// The time grid the week and day views share (M28, out of CalendarView)

/** Half-hour slots from 00:00 to 23:30. */
export const TIME_SLOTS = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
);

const SLOT_HEIGHT_PX = 30;
const HEADER_HEIGHT_PX = 60;
const DEFAULT_SCROLL_TIME = '07:30';

/** The tasks' colours by priority in the week view. */
export const PRIORITY_COLORS = {
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

/** Scrolls a timetable to the school morning (07:30). */
export function scrollToDefaultTime(element) {
  if (!element) return;
  const slotIndex = TIME_SLOTS.indexOf(DEFAULT_SCROLL_TIME);
  element.scrollTop = Math.max(0, slotIndex * SLOT_HEIGHT_PX + HEADER_HEIGHT_PX - 8);
}
