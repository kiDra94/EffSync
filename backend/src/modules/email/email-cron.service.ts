import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { EmailService } from "./email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TasksService } from "../tasks/tasks.service";

@Injectable()
export class EmailCronService {
  private logger = new Logger("EmailCronService");

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private tasksService: TasksService,
  ) {}

  /**
   * Daily at 08:00: check for tasks that are due
   * Sends e-mails to users whose tasks are due today or tomorrow
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDeadlines() {
    this.logger.log("🔔 Starting deadline check...");

    try {
      // Find all tasks due today or in the next days
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const inThreeDays = new Date(today);
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      inThreeDays.setHours(23, 59, 59, 999);

      const upcomingTasks = await this.prisma.tasks.findMany({
        where: {
          deadline: {
            gte: today,
            lte: inThreeDays,
          },
          status: { not: "COMPLETED" },
          assigned_to: { not: null }, // Only tasks with an assignee
        },
        include: {
          users_tasks_assigned_toTousers: true,
        },
      });

      this.logger.log(
        `Found ${upcomingTasks.length} tasks with upcoming deadlines`,
      );

      // For each task: send an e-mail to the assignee
      for (const task of upcomingTasks) {
        const assignedUser = task.users_tasks_assigned_toTousers;

        if (!assignedUser) continue;

        // 1️⃣ Send the e-mail
        const userPreferences = await this.prisma.email_preferences.findUnique({
          where: { user_id: assignedUser.user_id },
        });

        const prefersEmail = userPreferences?.email_on_deadline !== false;

        if (prefersEmail && assignedUser.email) {
          const sent = await this.emailService.sendDeadlineEmail(
            assignedUser.user_id,
            assignedUser.email,
            task.title || "Untitled Task",
            task.deadline || new Date(),
          );

          if (sent) {
            this.logger.log(
              `✉️  Deadline email sent to ${assignedUser.email} for task "${task.title}"`,
            );
          }
        }

        // 2️⃣ Feature #27: create the in-app notification
        const daysUntil = Math.ceil(
          ((task.deadline || new Date()).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000),
        );

        await this.notificationsService.create({
          user_id: assignedUser.user_id,
          type: "task_deadline",
          text: `⏰ Aufgabe "${task.title}" ist fällig in ${daysUntil} Tag(en)`,
          is_read: false,
        });

        this.logger.log(
          `📬 In-app notification created for user ${assignedUser.user_id}`,
        );
      }

      this.logger.log("✅ Deadline check completed");
    } catch (error) {
      this.logger.error("❌ Error during deadline check:", error);
    }
  }

  /**
   * Hourly: check for overdue tasks
   * Locks overdue tasks and sends notifications
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueDeadlines() {
    this.logger.log("🚨 Checking for overdue deadlines...");

    try {
      const now = new Date();

      // Feature #27: find all overdue tasks that aren't locked yet
      const overdueTasks = await this.prisma.tasks.findMany({
        where: {
          deadline: {
            lt: now,
          },
          status: { not: "COMPLETED" },
          assigned_to: { not: null },
          is_locked: false, // ✅ Feature #27: only tasks that aren't locked yet
        },
        include: {
          users_tasks_assigned_toTousers: true,
        },
      });

      if (overdueTasks.length > 0) {
        this.logger.warn(`⚠️  Found ${overdueTasks.length} overdue tasks`);

        for (const task of overdueTasks) {
          const assignedUser = task.users_tasks_assigned_toTousers;

          if (!assignedUser) continue;

          // 1️⃣ Feature #27: lock the task automatically
          await this.prisma.tasks.update({
            where: { task_id: task.task_id },
            data: {
              is_locked: true,
              locked_reason: "OVERDUE",
              locked_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          });
          this.logger.warn(`🔒 Locked task ${task.task_id}: ${task.title}`);

          // 2️⃣ Send the e-mail
          const userPreferences =
            await this.prisma.email_preferences.findUnique({
              where: { user_id: assignedUser.user_id },
            });

          const prefersEmail = userPreferences?.email_on_deadline !== false;

          if (prefersEmail && assignedUser.email && task.deadline) {
            await this.emailService.sendDeadlineEmail(
              assignedUser.user_id,
              assignedUser.email,
              task.title || "Untitled Task",
              task.deadline,
            );
            this.logger.log(
              `✉️  Overdue email sent to ${assignedUser.email} for task "${task.title}"`,
            );
          }

          // 3️⃣ Feature #27: in-app notification (URGENT)
          await this.notificationsService.create({
            user_id: assignedUser.user_id,
            type: "task_overdue",
            text: `🚨 AUFGABE ÜBERFÄLLIG: "${task.title}" wurde automatisch gesperrt!`,
            is_read: false,
          });

          this.logger.warn(
            `📬 Overdue notification created for user ${assignedUser.user_id}`,
          );
        }
      }

      this.logger.log("✅ Overdue check completed");
    } catch (error) {
      this.logger.error("❌ Error checking overdue deadlines:", error);
    }
  }

  /**
   * Manual method to trigger a test e-mail
   */
  async sendTestEmail(userId: number, userEmail: string): Promise<boolean> {
    this.logger.log(`Sending test email to ${userEmail}`);

    return this.emailService.sendDeadlineEmail(
      userId,
      userEmail,
      "Test Task",
      new Date(),
    );
  }
}
