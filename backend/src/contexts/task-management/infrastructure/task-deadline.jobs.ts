import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TaskDeadlinesService } from "../application/task-deadlines.service";

/**
 * The schedule of the deadline jobs (EmailCronService before M23). The
 * cron scheduler is registered by `ScheduleModule.forRoot()` in AppModule.
 * A failing run is logged; the next run tries again.
 */
@Injectable()
export class TaskDeadlineJobs {
  private readonly logger = new Logger(TaskDeadlineJobs.name);

  constructor(private readonly deadlines: TaskDeadlinesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDeadlines() {
    try {
      await this.deadlines.remindUpcoming();
    } catch (error) {
      this.logger.error("Error during deadline check:", error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueDeadlines() {
    try {
      await this.deadlines.lockOverdue();
    } catch (error) {
      this.logger.error("Error checking overdue deadlines:", error);
    }
  }
}
