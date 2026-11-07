import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import {
  isRoleIn,
  PRIVILEGED_ROLES,
} from "../../config/role-permissions.config";

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  private buildTaskVisibilityFilter(user: any) {
    if (isRoleIn(user?.role, PRIVILEGED_ROLES)) {
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
   * Status distribution: number of tasks per status
   */
  async getStatusDistribution(user: any) {
    const where = this.buildTaskVisibilityFilter(user);
    const tasks = await this.prisma.tasks.findMany({
      where,
      select: { status: true, deadline: true },
    });

    const distribution = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      COMPLETED: 0,
      ON_HOLD: 0,
      OVERDUE: 0,
    };

    const now = new Date();
    tasks.forEach((task) => {
      if (
        task.deadline &&
        new Date(task.deadline) < now &&
        task.status !== "COMPLETED"
      ) {
        distribution.OVERDUE++;
      } else if (task.status && task.status in distribution) {
        distribution[task.status]++;
      }
    });

    return {
      labels: [
        "Offen",
        "In Bearbeitung",
        "In Review",
        "Abgeschlossen",
        "In Wartestellung",
        "Überfällig",
      ],
      data: [
        distribution.TODO,
        distribution.IN_PROGRESS,
        distribution.IN_REVIEW,
        distribution.COMPLETED,
        distribution.ON_HOLD,
        distribution.OVERDUE,
      ],
      total: tasks.length,
    };
  }

  /**
   * Progress metrics: completion rate
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

    const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
    const completionRate =
      tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    // Average progress of all tasks
    const avgProgress =
      tasks.length > 0
        ? Math.round(
            tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length,
          )
        : 0;

    // Overdue tasks
    const now = new Date();
    const overdueCount = tasks.filter(
      (t) =>
        t.deadline && new Date(t.deadline) < now && t.status !== "COMPLETED",
    ).length;

    const openCount = tasks.filter((t) => t.status !== "COMPLETED").length;

    return {
      totalTasks: tasks.length,
      completedTasks: completedCount,
      openTasks: openCount,
      completionRate,
      averageProgress: avgProgress,
      overtasks: overdueCount,
      percentageOverdue:
        tasks.length > 0 ? Math.round((overdueCount / tasks.length) * 100) : 0,
    };
  }

  /*
   * Tasks per status
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
      orderBy: { status: "asc" },
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
