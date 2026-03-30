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
}
