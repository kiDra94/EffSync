/** A trend period (T37, FA-33). */
export type TrendPeriod = "week" | "month";

/** The dates a task counts on: created, and (if done) completed. */
interface TrendRow {
  created_at: Date | null;
  completed_at: Date | null;
}

export interface TrendSeries {
  period: TrendPeriod;
  labels: string[];
  created: number[];
  completed: number[];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

function startOf(period: TrendPeriod, date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (period === "month") {
    start.setDate(1);
  } else {
    // Monday is the first day of the week
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  }
  return start;
}

function shift(period: TrendPeriod, start: Date, by: number): Date {
  const next = new Date(start);
  if (period === "month") next.setMonth(next.getMonth() + by);
  else next.setDate(next.getDate() + 7 * by);
  return next;
}

/** The starts of the last `count` periods up to the current one, oldest first. */
export function periodStarts(
  period: TrendPeriod,
  count: number,
  now: Date,
): Date[] {
  const current = startOf(period, now);
  return Array.from({ length: count }, (_, index) =>
    shift(period, current, index - (count - 1)),
  );
}

/** ISO 8601 calendar week of a date. */
function isoWeek(date: Date): number {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + 3 - ((day.getDay() + 6) % 7));
  const firstThursday = new Date(day.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((day.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7,
    )
  );
}

function label(period: TrendPeriod, start: Date): string {
  return period === "month"
    ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
    : `KW ${isoWeek(start)}`;
}

/** Created and completed tasks per period of the window. */
export function trendSeries(
  rows: TrendRow[],
  period: TrendPeriod,
  count: number,
  now: Date,
): TrendSeries {
  const starts = periodStarts(period, count, now);
  const end = shift(period, starts[starts.length - 1], 1);
  const bucket = (date: Date | null) => {
    if (!date || date < starts[0] || date >= end) return -1;
    let index = starts.length - 1;
    while (date < starts[index]) index--;
    return index;
  };

  const created = starts.map(() => 0);
  const completed = starts.map(() => 0);
  for (const row of rows) {
    const c = bucket(row.created_at);
    if (c >= 0) created[c]++;
    const d = bucket(row.completed_at);
    if (d >= 0) completed[d]++;
  }
  return {
    period,
    labels: starts.map((start) => label(period, start)),
    created,
    completed,
  };
}
