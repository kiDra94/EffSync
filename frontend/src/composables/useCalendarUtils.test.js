import { describe, expect, it } from 'vitest';
import {
  formatDateKey,
  getIsoWeek,
  getWeekDays,
  getWeekStart,
  setDateKeepingTime,
  shiftDateKey,
  weekdayIndex,
} from './useCalendarUtils';

describe('useCalendarUtils', () => {
  it('returns monday as week start', () => {
    const start = getWeekStart(new Date('2026-04-10T09:00:00.000Z')); // Friday
    expect(start.getDay()).toBe(1);
  });

  it('formats date key correctly', () => {
    expect(formatDateKey(new Date('2026-03-07T12:30:00.000Z'))).toBe('2026-03-07');
  });

  it('keeps time while changing date', () => {
    const moved = setDateKeepingTime('2026-04-10T14:45:00.000Z', '2026-04-15');
    const date = new Date(moved);

    expect(formatDateKey(date)).toBe('2026-04-15');
    expect(date.getUTCHours()).toBe(14);
    expect(date.getUTCMinutes()).toBe(45);
  });

  it('builds seven days for a week', () => {
    const days = getWeekDays(new Date('2026-04-06T00:00:00.000Z'));

    expect(days).toHaveLength(7);
    expect(days[0].dayName).toBe('Mo');
    expect(days[6].dayName).toBe('So');
  });

  it('calculates ISO week number', () => {
    expect(getIsoWeek(new Date('2026-01-05T00:00:00.000Z'))).toBe(2);
  });

  // M28: what CalendarView computed inline
  it('counts the weekday from Monday', () => {
    expect(weekdayIndex(new Date(2026, 10, 9))).toBe(0); // Monday
    expect(weekdayIndex(new Date(2026, 10, 15))).toBe(6); // Sunday
  });

  it('shifts a date key by days, across months', () => {
    expect(shiftDateKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDateKey('', 1)).toBeNull();
  });
});
