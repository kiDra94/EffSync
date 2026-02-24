import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class EmailCronService {
  private logger = new Logger('EmailCronService');

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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

        // Überprüfe ob der Benutzer E-Mail-Benachrichtigungen aktiviert hat
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
      }

      this.logger.log('✅ Deadline check completed');
    } catch (error) {
      this.logger.error('❌ Error during deadline check:', error);
    }
  }

  /**
   * Stündlich: Prüfe auf überfällige Aufgaben
   * Versendet Erinnerungen an Benutzer deren Aufgaben überfällig sind
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueDeadlines() {
    try {
      // Finde alle Aufgaben die überfällig sind
      const now = new Date();

      const overdueTasks = await this.prisma.tasks.findMany({
        where: {
          deadline: {
            lt: now,
          },
          status: { not: 'COMPLETED' },
          assigned_to: { not: null },
        },
        include: {
          users_tasks_assigned_toTousers: true,
        },
      });

      if (overdueTasks.length > 0) {
        this.logger.warn(
          `⚠️  Found ${overdueTasks.length} overdue tasks`,
        );

        // Sende Erinnerungen für überfällige Aufgaben
        for (const task of overdueTasks) {
          const assignedUser = task.users_tasks_assigned_toTousers;

          if (!assignedUser) continue;

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
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking overdue deadlines:', error);
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
