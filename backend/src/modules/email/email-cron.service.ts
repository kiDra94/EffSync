import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class EmailCronService {
  private logger = new Logger('EmailCronService');

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private tasksService: TasksService,
  ) {}

  /**
   * Täglich um 08:00 Uhr: Prüfe auf fällige Aufgaben
   * Versendet E-Mails an Benutzer deren Aufgaben heute oder morgen fällig sind
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDeadlines() {
    this.logger.log('🔔 Starting deadline check...');

    try {
      // Finde alle Aufgaben die heute oder in den nächsten Tagen fällig sind
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
          status: { not: 'COMPLETED' },
          assigned_to: { not: null }, // Nur Aufgaben mit zugewiesener Person
        },
        include: {
          users_tasks_assigned_toTousers: true,
        },
      });

      this.logger.log(`Found ${upcomingTasks.length} tasks with upcoming deadlines`);

      // Für jede Aufgabe: Sende E-Mail an den zugewiesenen Benutzer
      for (const task of upcomingTasks) {
        const assignedUser = task.users_tasks_assigned_toTousers;

        if (!assignedUser) continue;

        // 1️⃣ E-Mail senden
        const userPreferences = await this.prisma.email_preferences.findUnique({
          where: { user_id: assignedUser.user_id },
        });

        const prefersEmail =
          userPreferences?.email_on_deadline !== false;

        if (prefersEmail && assignedUser.email) {
          const sent = await this.emailService.sendDeadlineEmail(
            assignedUser.user_id,
            assignedUser.email,
            task.title || 'Untitled Task',
            task.deadline || new Date(),
          );

          if (sent) {
            this.logger.log(
              `✉️  Deadline email sent to ${assignedUser.email} for task "${task.title}"`,
            );
          }
        }

        // 2️⃣ Feature #27: In-App Notification erstellen
        const daysUntil = Math.ceil(
          ((task.deadline || new Date()).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );

        await this.notificationsService.create({
          user_id: assignedUser.user_id,
          type: 'task_deadline',
          text: `⏰ Aufgabe "${task.title}" ist fällig in ${daysUntil} Tag(en)`,
          is_read: false,
        });

        this.logger.log(
          `📬 In-app notification created for user ${assignedUser.user_id}`,
        );
      }

      this.logger.log('✅ Deadline check completed');
    } catch (error) {
      this.logger.error('❌ Error during deadline check:', error);
    }
  }

  /**
   * Stündlich: Prüfe auf überfällige Aufgaben
   * Sperrt überf ällige Aufgaben und sendet Benachrichtigungen
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueDeadlines() {
    this.logger.log('🚨 Checking for overdue deadlines...');

    try {
      const now = new Date();

      // Feature #27: Finde alle überfälligen Tasks die noch nicht gesperrt sind
      const overdueTasks = await this.prisma.tasks.findMany({
        where: {
          deadline: {
            lt: now,
          },
          status: { not: 'COMPLETED' },
          assigned_to: { not: null },
          is_locked: false, // ✅ Feature #27: Nur noch nicht gesperrte Tasks
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

          // 1️⃣ Feature #27: Task automatisch sperren
          await this.prisma.tasks.update({
            where: { task_id: task.task_id },
            data: {
              is_locked: true,
              locked_reason: 'OVERDUE',
              locked_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage
            },
          });
          this.logger.warn(`🔒 Locked task ${task.task_id}: ${task.title}`);

          // 2️⃣ E-Mail senden
          const userPreferences = await this.prisma.email_preferences.findUnique({
            where: { user_id: assignedUser.user_id },
          });

          const prefersEmail =
            userPreferences?.email_on_deadline !== false;

          if (prefersEmail && assignedUser.email && task.deadline) {
            await this.emailService.sendDeadlineEmail(
              assignedUser.user_id,
              assignedUser.email,
              task.title || 'Untitled Task',
              task.deadline,
            );
            this.logger.log(
              `✉️  Overdue email sent to ${assignedUser.email} for task "${task.title}"`,
            );
          }

          // 3️⃣ Feature #27: In-App Notification (URGENT)
          await this.notificationsService.create({
            user_id: assignedUser.user_id,
            type: 'task_overdue',
            text: `🚨 AUFGABE ÜBERFÄLLIG: "${task.title}" wurde automatisch gesperrt!`,
            is_read: false,
          });

          this.logger.warn(
            `📬 Overdue notification created for user ${assignedUser.user_id}`,
          );
        }
      }

      this.logger.log('✅ Overdue check completed');
    } catch (error) {
      this.logger.error('❌ Error checking overdue deadlines:', error);
    }
  }

  /**
   * Manuelle Methode um E-Mail-Test auszulösen
   */
  async sendTestEmail(userId: number, userEmail: string): Promise<boolean> {
    this.logger.log(`Sending test email to ${userEmail}`);

    return this.emailService.sendDeadlineEmail(
      userId,
      userEmail,
      'Test Task',
      new Date(),
    );
  }
}
