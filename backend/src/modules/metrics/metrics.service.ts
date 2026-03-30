import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Statusverteilung: Anzahl Tasks pro Status
   */
  async getStatusDistribution() {
    const tasks = await this.prisma.tasks.findMany({
      select: { status: true },
    });

    const distribution = {
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      ON_HOLD: 0,
    };

    tasks.forEach((task) => {
      if (task.status && task.status in distribution) {
        distribution[task.status]++;
      }
    });

    return {
      labels: ['Offen', 'In Bearbeitung', 'Abgeschlossen', 'In Wartestellung'],
      data: [
        distribution.OPEN,
        distribution.IN_PROGRESS,
        distribution.COMPLETED,
        distribution.ON_HOLD,
      ],
      total: tasks.length,
    };
  }

  /**
   * Fortschrittsmetriken: Completion-Rate
   */
  async getTaskProgress() {
    const tasks = await this.prisma.tasks.findMany({
      select: {
        task_id: true,
        status: true,
        progress: true,
        deadline: true,
      },
    });

    const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    const completionRate =
      tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    // Durchschnittlicher Fortschritt aller Tasks
    const avgProgress =
      tasks.length > 0
        ? Math.round(
            tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length,
          )
        : 0;

    // Überfällige Tasks
    const now = new Date();
    const overdueCount = tasks.filter(
      (t) =>
        t.deadline &&
        new Date(t.deadline as Date) < now &&
        t.status !== 'COMPLETED',
    ).length;

    return {
      totalTasks: tasks.length,
      completedTasks: completedCount,
      completionRate,
      averageProgress: avgProgress,
      overtasks: overdueCount,
      percentageOverdue:
        tasks.length > 0
          ? Math.round((overdueCount / tasks.length) * 100)
          : 0,
    };
  }

  /**
   * Wöchentliche Trends: Tasks die diese Woche abgeschlossen wurden
   */
  async getWeeklyTrends() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sonntag
    weekStart.setHours(0, 0, 0, 0);

    const tasks = await this.prisma.tasks.findMany({
      where: {
        status: 'COMPLETED',
        updated_at: {
          gte: weekStart,
        },
      },
      select: {
        task_id: true,
        updated_at: true,
      },
    });

    // Gruppiere nach Wochentag
    const trendsByDay = {
      Sonntag: 0,
      Montag: 0,
      Dienstag: 0,
      Mittwoch: 0,
      Donnerstag: 0,
      Freitag: 0,
      Samstag: 0,
    };

    const dayNames = [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
    ];

    tasks.forEach((task) => {
      if (!task.updated_at) return;
      const dayIndex = new Date(task.updated_at).getDay();
      const dayName = dayNames[dayIndex];
      if (dayName in trendsByDay) {
        trendsByDay[dayName]++;
      }
    });

    return {
      labels: Object.keys(trendsByDay),
      data: Object.values(trendsByDay),
      totalThisWeek: tasks.length,
    };
  }

  /**
   * Monatliche Übersicht: Tasks pro Monat
   */
  async getMonthlyTrends() {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);

    const tasks = await this.prisma.tasks.findMany({
      where: {
        status: 'COMPLETED',
        updated_at: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        task_id: true,
        updated_at: true,
      },
    });

    // Gruppiere nach Monat
    const trendsByMonth: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      const monthKey = date.toLocaleDateString('de-DE', {
        month: 'short',
        year: '2-digit',
      });
      trendsByMonth[monthKey] = 0;
    }

    tasks.forEach((task) => {
      if (!task.updated_at) return;
      const date = new Date(task.updated_at);
      const monthKey = date.toLocaleDateString('de-DE', {
        month: 'short',
        year: '2-digit',
      });
      if (monthKey in trendsByMonth) {
        trendsByMonth[monthKey]++;
      }
    });

    return {
      labels: Object.keys(trendsByMonth),
      data: Object.values(trendsByMonth),
      totalLast6Months: tasks.length,
    };
  }
}
