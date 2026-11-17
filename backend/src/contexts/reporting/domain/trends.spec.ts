import { periodStarts, trendSeries } from "./trends";

// T37 (FA-33, decision A4): created and completed tasks per week and month
describe("trends", () => {
  const NOW = new Date("2026-11-11T10:00:00"); // a Wednesday

  it("starts weeks on Monday and months on the 1st, oldest first", () => {
    expect(periodStarts("week", 3, NOW)).toEqual([
      new Date("2026-10-26T00:00:00"),
      new Date("2026-11-02T00:00:00"),
      new Date("2026-11-09T00:00:00"),
    ]);
    expect(periodStarts("month", 2, NOW)).toEqual([
      new Date("2026-10-01T00:00:00"),
      new Date("2026-11-01T00:00:00"),
    ]);
  });

  it("counts created and completed tasks per week, with calendar-week labels", () => {
    const series = trendSeries(
      [
        { created_at: new Date("2026-11-03T08:00:00"), completed_at: null },
        {
          created_at: new Date("2026-11-04T08:00:00"),
          completed_at: new Date("2026-11-10T09:00:00"),
        },
        // outside the window: not counted
        { created_at: new Date("2026-01-01T08:00:00"), completed_at: null },
      ],
      "week",
      2,
      NOW,
    );

    expect(series).toEqual({
      period: "week",
      labels: ["KW 45", "KW 46"],
      created: [2, 0],
      completed: [0, 1],
    });
  });

  it("labels months with their German short name and year", () => {
    const series = trendSeries(
      [{ created_at: new Date("2026-10-15T08:00:00"), completed_at: null }],
      "month",
      2,
      NOW,
    );

    expect(series.labels).toEqual(["Okt 2026", "Nov 2026"]);
    expect(series.created).toEqual([1, 0]);
  });
});
