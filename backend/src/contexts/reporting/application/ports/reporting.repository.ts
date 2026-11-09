import type { SubtreeCount } from "../../domain/projects";

/**
 * Which tasks a metric counts: all, or the user's visible set (decision B3,
 * the same tasks the task list shows; review M24).
 */
export type TaskScope = { all: true } | { taskIds: number[] };

export interface TaskStatRow {
  task_id: number;
  title: string | null;
  status: string | null;
  deadline: Date | null;
  progress: number | null;
}

interface ProjectRow {
  task_id: number;
  title: string | null;
  deadline: Date | null;
  progress: number | null;
}

export interface MemberCount {
  user_id: number;
  firstname: string;
  lastname: string;
  completed: number;
}

interface TrendTaskRow {
  created_at: Date | null;
  updated_at: Date | null;
  status: string | null;
}

/**
 * Read-only task statistics for the dashboard (port; Prisma in
 * infrastructure). reporting reads the task tables directly: it writes
 * nothing (GOALS.md M24 step 1).
 */
export abstract class ReportingRepository {
  /** The scope's tasks, ordered by status (the queries MetricsService made before M24). */
  abstract findTasks(scope: TaskScope): Promise<TaskStatRow[]>;
  /** Top-level tasks that aren't completed (decision Q2). */
  abstract findActiveProjects(scope: TaskScope): Promise<ProjectRow[]>;
  /** Per project: all tasks below it and the completed ones. */
  abstract countSubtrees(
    projectIds: number[],
  ): Promise<Map<number, SubtreeCount>>;
  /** The assignees with the most completed tasks in the scope. */
  abstract findTopAssignees(
    scope: TaskScope,
    limit: number,
  ): Promise<MemberCount[]>;
  /** Tasks created or changed since the date. */
  abstract findTrendRows(
    scope: TaskScope,
    since: Date,
  ): Promise<TrendTaskRow[]>;
}
