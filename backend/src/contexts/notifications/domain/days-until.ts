/** Whole calendar days from today to the date (0 today, negative when past). */
export function daysUntil(date: Date, now = new Date()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return Math.ceil((day.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
