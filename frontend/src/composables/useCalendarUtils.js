/** The weekdays' short names from Monday (review M28: one copy). */
export const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function getWeekStart(dateInput) {
  const date = new Date(dateInput);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export function getIsoWeek(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function formatDateKey(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function setDateKeepingTime(originalDateInput, targetDateKey) {
  const [targetYear, targetMonth, targetDay] = targetDateKey.split('-').map(Number);
  const base = originalDateInput ? new Date(originalDateInput) : new Date();

  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setHours(12, 0, 0, 0);
    fallback.setFullYear(targetYear, targetMonth - 1, targetDay);
    return fallback.toISOString();
  }

  const moved = new Date(base);
  moved.setFullYear(targetYear, targetMonth - 1, targetDay);
  return moved.toISOString();
}

/** The weekday counted from Monday: Monday 0 … Sunday 6 (M28). */
export function weekdayIndex(dateInput) {
  return (new Date(dateInput).getDay() + 6) % 7;
}

/** The date key `days` days later (earlier when negative); null without a key (M28). */
export function shiftDateKey(dateKey, days) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  return formatDateKey(new Date(year, month - 1, day + days));
}

export function getWeekDays(weekStartInput) {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(weekStartInput);
    date.setDate(date.getDate() + index);

    return {
      dayName: WEEKDAY_NAMES[index],
      date,
      dateKey: formatDateKey(date),
      isToday: formatDateKey(date) === formatDateKey(new Date()),
    };
  });
}
