import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  private buildTaskVisibilityFilter(user: any) {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'superuser') {
      return {};
    }

    const userId = Number(user?.userId || user?.id);
    if (!userId) {
      return { task_id: -1 };
    }

    return {
      OR: [
        { created_by: userId },
        { assigned_to: userId },
        { task_members: { some: { user_id: userId } } },
      ],
    };
  }

  /**
   * Statusverteilung: Anzahl Tasks pro Status
   */
  async getStatusDistribution(user: any) {
    const where = this.buildTaskVisibilityFilter(user);
    const tasks = await this.prisma.tasks.findMany({
      where,
      select: { status: true },
    });

    const distribution = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      COMPLETED: 0,
      ON_HOLD: 0,
    };

    tasks.forEach((task) => {
      if (task.status && task.status in distribution) {
        distribution[task.status]++;
      }
    });

    return {
      labels: ['Offen', 'In Bearbeitung', 'In Review', 'Abgeschlossen', 'In Wartestellung'],
      data: [
        distribution.TODO,
        distribution.IN_PROGRESS,
        distribution.IN_REVIEW,
        distribution.COMPLETED,
        distribution.ON_HOLD,
      ],
      total: tasks.length,
    };
  }

  /**
   * Fortschrittsmetriken: Completion-Rate
   */
  async getTaskProgress(user: any) {
    const where = this.buildTaskVisibilityFilter(user);
    const tasks = await this.prisma.tasks.findMany({
      where,
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

  /*
   * Tasks pro Status
   */
  async getTasksByStatus(user: any) {
    const where = this.buildTaskVisibilityFilter(user);
    const tasks = await this.prisma.tasks.findMany({
      where,
      select: {
        task_id: true,
        title: true,
        status: true,
        deadline: true,
        progress: true,
      },
      orderBy: { status: 'asc' },
    });

    const byStatus: Record<string, any[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      COMPLETED: [],
      ON_HOLD: [],
    };

    tasks.forEach((task) => {
      if (task.status && task.status in byStatus) {
        byStatus[task.status].push(task);
      }
    });

    return byStatus;
  }

}
