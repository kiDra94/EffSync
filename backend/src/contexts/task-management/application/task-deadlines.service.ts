import { Injectable, Logger } from "@nestjs/common";
import { DeadlineMailer, Notifier } from "../../notifications/application";
import { calendarDaysUntil } from "../domain/task";
import type { DeadlineTask } from "./ports/task.repository";
import { TaskRepository } from "./ports/task.repository";
import { TaskLockingService } from "./task-locking.service";

/**
 * The deadline reminders (T46) and the overdue lock (feature #27), which
 * EmailCronService ran before M23. They are task rules, so they live in
 * task-management and reach mail and in-app notifications through the
 * notifications context's ports (no cycle between the two contexts).
 */
@Injectable()
export class TaskDeadlinesService {
  private readonly logger = new Logger(TaskDeadlinesService.name);

  constructor(
    private readonly tasks: TaskRepository,
    private readonly locking: TaskLockingService,
    private readonly mailer: DeadlineMailer,
    private readonly notifier: Notifier,
  ) {}

  /**
   * Daily: the assignees of open tasks due from now to the end of the third
   * day ahead (an already overdue task is the hourly job's, review M23).
   */
  async remindUpcoming(now = new Date()) {
    const inThreeDays = new Date(now);
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    inThreeDays.setHours(23, 59, 59, 999);

    const due = await this.tasks.findDueBetween(now, inThreeDays);
    this.logger.log(`Found ${due.length} tasks with upcoming deadlines`);
    await this.forEach(due, async (task) => {
      const deadline = task.deadline ?? now;
      await this.mailer.sendDeadlineReminder(
        task.assignee,
        task.title || "Untitled Task",
        deadline,
      );
      const days = calendarDaysUntil(deadline, now);
      await this.notifier.notify({
        userId: task.assignee.user_id,
        type: "task_deadline",
        text: `⏰ Aufgabe "${task.title}" ist fällig in ${days} Tag(en)`,
      });
    });
  }

  /** Hourly: overdue open tasks are locked, and their assignees told. */
  async lockOverdue(now = new Date()) {
    const overdue = await this.tasks.findOverdueUnlocked(now);
    if (overdue.length > 0) {
      this.logger.warn(`Found ${overdue.length} overdue tasks`);
    }
    await this.forEach(overdue, async (task) => {
      // locked for 7 days, and task:locked to the assignee
      await this.locking.lockOverdueTask(task.task_id, "OVERDUE");
      if (task.deadline) {
        await this.mailer.sendDeadlineReminder(
          task.assignee,
          task.title || "Untitled Task",
          task.deadline,
        );
      }
      await this.notifier.notify({
        userId: task.assignee.user_id,
        type: "task_overdue",
        text: `🚨 AUFGABE ÜBERFÄLLIG: "${task.title}" wurde automatisch gesperrt!`,
      });
    });
  }

  /** One task's failure is logged; the others still get theirs (review M23). */
  private async forEach(
    tasks: DeadlineTask[],
    work: (task: DeadlineTask) => Promise<void>,
  ) {
    for (const task of tasks) {
      try {
        await work(task);
      } catch (error) {
        this.logger.error(
          `Deadline job failed for task ${task.task_id}`,
          error,
        );
      }
    }
  }
}
