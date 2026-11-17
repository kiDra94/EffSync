import { SCHEDULE_CRON_OPTIONS } from "@nestjs/schedule/dist/schedule.constants";
import { CronExpression } from "@nestjs/schedule";
import type { TaskDeadlinesService } from "../application/task-deadlines.service";
import { TaskDeadlineJobs } from "./task-deadline.jobs";

// M23: the schedule of the deadline jobs (daily at 8, hourly), and a failing
// run doesn't crash the scheduler
describe("TaskDeadlineJobs", () => {
  const cronOf = (method: "checkDeadlines" | "checkOverdueDeadlines") =>
    (
      Reflect.getMetadata(
        SCHEDULE_CRON_OPTIONS,
        TaskDeadlineJobs.prototype[method],
      ) as { cronTime: string }
    ).cronTime;

  it("runs the reminder daily at 8 and the overdue lock every hour", () => {
    expect(cronOf("checkDeadlines")).toBe(CronExpression.EVERY_DAY_AT_8AM);
    expect(cronOf("checkOverdueDeadlines")).toBe(CronExpression.EVERY_HOUR);
  });

  it("logs a failing run instead of throwing", async () => {
    const deadlines = {
      remindUpcoming: jest.fn().mockRejectedValue(new Error("db down")),
      lockOverdue: jest.fn().mockRejectedValue(new Error("db down")),
    };
    const jobs = new TaskDeadlineJobs(
      deadlines as unknown as TaskDeadlinesService,
    );

    await expect(jobs.checkDeadlines()).resolves.toBeUndefined();
    await expect(jobs.checkOverdueDeadlines()).resolves.toBeUndefined();
  });
});
