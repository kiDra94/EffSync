import { Injectable } from "@nestjs/common";
import { TaskVisibilityService } from "../../task-management/application";
import { projectProgress } from "../domain/projects";
import {
  trendSeries,
  type TrendPeriod,
  type TrendSeries,
} from "../domain/trends";
import {
  ReportingRepository,
  type MemberCount,
  type TaskScope,
  type TaskStatRow,
} from "./ports/reporting.repository";

/** The requester as the metrics see them (the JWT's user). */
interface MetricsUser {
  userId?: number;
  id?: number;
}

const STATUS_LABELS: [string, string][] = [
  ["TODO", "Offen"],
  ["IN_PROGRESS", "In Bearbeitung"],
  ["IN_REVIEW", "In Review"],
  ["COMPLETED", "Abgeschlossen"],
  ["ON_HOLD", "In Wartestellung"],
];

/** How many periods the trend chart shows (8 weeks, 6 months). */
const TREND_WINDOW: Record<TrendPeriod, number> = { week: 8, month: 6 };

/**
 * The dashboard metrics (FA-30 to FA-35, M24), over the tasks the user sees
 * in the task list.
 */
@Injectable()
export class ReportingService {
  constructor(
    private readonly reporting: ReportingRepository,
    private readonly visibility: TaskVisibilityService,
  ) {}

  /**
   * The tasks the user sees in the task list (decision B3, review M24):
   * staff all, everyone else their own, assigned and member tasks with
   * their subtasks. Without a user, none.
   */
  private async scopeOf(user: MetricsUser): Promise<TaskScope> {
    const userId = Number(user?.userId || user?.id) || 0;
    if (!userId) return { taskIds: [] };
    const ids = await this.visibility.visibleIdsFor(userId);
    return ids === undefined ? { all: true } : { taskIds: ids };
  }

  private isOverdue(task: { deadline: Date | null; status: string | null }) {
    return Boolean(
      task.deadline &&
      task.deadline < new Date() &&
      task.status !== "COMPLETED",
    );
  }

  /** FA-32: tasks per status, overdue ones separately (the donut chart). */
  async getStatusDistribution(user: MetricsUser) {
    const tasks = await this.reporting.findTasks(await this.scopeOf(user));
    const counts = new Map(STATUS_LABELS.map(([status]) => [status, 0]));
    let overdue = 0;
    for (const task of tasks) {
      if (this.isOverdue(task)) overdue++;
      else if (task.status && counts.has(task.status)) {
        counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
      }
    }
    return {
      labels: [...STATUS_LABELS.map(([, label]) => label), "Überfällig"],
      data: [
        ...STATUS_LABELS.map(([status]) => counts.get(status) ?? 0),
        overdue,
      ],
      total: tasks.length,
    };
  }

  /** FA-31: total, open, completed and overdue tasks. */
  async getTaskProgress(user: MetricsUser) {
    const tasks = await this.reporting.findTasks(await this.scopeOf(user));
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const overdue = tasks.filter((t) => this.isOverdue(t)).length;
    const percent = (part: number) =>
      total > 0 ? Math.round((part / total) * 100) : 0;
    return {
      totalTasks: total,
      completedTasks: completed,
      openTasks: total - completed,
      completionRate: percent(completed),
      averageProgress:
        total > 0
          ? Math.round(
              tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total,
            )
          : 0,
      overtasks: overdue,
      percentageOverdue: percent(overdue),
    };
  }

  /** The scope's tasks grouped by status. */
  async getTasksByStatus(
    user: MetricsUser,
  ): Promise<Record<string, TaskStatRow[]>> {
    const tasks = await this.reporting.findTasks(await this.scopeOf(user));
    const byStatus: Record<string, TaskStatRow[]> = Object.fromEntries(
      STATUS_LABELS.map(([status]) => [status, []]),
    );
    for (const task of tasks) {
      if (task.status && task.status in byStatus)
        byStatus[task.status].push(task);
    }
    return byStatus;
  }

  /** FA-30, FA-34 (T41, T39, decision Q2): active projects with their progress. */
  async getActiveProjects(user: MetricsUser) {
    const projects = await this.reporting.findActiveProjects(
      await this.scopeOf(user),
    );
    const subtrees = await this.reporting.countSubtrees(
      projects.map((project) => project.task_id),
    );
    return projects.map((project) => ({
      task_id: project.task_id,
      title: project.title,
      deadline: project.deadline,
      subtask_count: subtrees.get(project.task_id)?.total ?? 0,
      progress: projectProgress(
        subtrees.get(project.task_id),
        project.progress,
      ),
    }));
  }

  /** FA-35 (T40): the five members with the most completed tasks. */
  async getTopMembers(user: MetricsUser): Promise<MemberCount[]> {
    return this.reporting.findTopAssignees(await this.scopeOf(user), 5);
  }

  /**
   * FA-33 (T37, decision A4): created and completed tasks per week or month.
   * The completion date is the last change of a completed task (no schema
   * change; see PROGRESS.md M24).
   */
  async getTrends(
    user: MetricsUser,
    period: TrendPeriod,
    now = new Date(),
  ): Promise<TrendSeries> {
    const count = TREND_WINDOW[period];
    const since =
      period === "month"
        ? new Date(now.getFullYear(), now.getMonth() - count, 1)
        : new Date(now.getTime() - 7 * (count + 1) * 24 * 60 * 60 * 1000);
    const rows = await this.reporting.findTrendRows(
      await this.scopeOf(user),
      since,
    );
    return trendSeries(
      rows.map((row) => ({
        created_at: row.created_at,
        completed_at: row.status === "COMPLETED" ? row.updated_at : null,
      })),
      period,
      count,
      now,
    );
  }
}
