import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import {
  ReportingRepository,
  type TaskScope,
} from "../../application/ports/reporting.repository";
import type { SubtreeCount } from "../../domain/projects";

/** Read-only statistics on Prisma (M24, MetricsService before). */
@Injectable()
export class PrismaReportingRepository extends ReportingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private where(scope: TaskScope): Prisma.tasksWhereInput {
    return "all" in scope ? {} : { task_id: { in: scope.taskIds } };
  }

  findTasks(scope: TaskScope) {
    return this.prisma.tasks.findMany({
      where: this.where(scope),
      select: {
        task_id: true,
        title: true,
        status: true,
        deadline: true,
        progress: true,
      },
      orderBy: { status: "asc" },
    });
  }

  findActiveProjects(scope: TaskScope) {
    return this.prisma.tasks.findMany({
      where: {
        AND: [
          this.where(scope),
          { parent_task_id: null, status: { not: "COMPLETED" } },
        ],
      },
      select: { task_id: true, title: true, deadline: true, progress: true },
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { task_id: "asc" },
      ],
    });
  }

  async countSubtrees(projectIds: number[]) {
    const counts = new Map<number, SubtreeCount>();
    if (projectIds.length === 0) return counts;
    const rows = await this.prisma.$queryRaw<
      { root: number; total: bigint; completed: bigint }[]
    >`
      WITH RECURSIVE subtree AS (
        SELECT task_id, task_id AS root FROM tasks
        WHERE task_id IN (${Prisma.join(projectIds)})
        UNION ALL
        SELECT t.task_id, s.root FROM tasks t
        JOIN subtree s ON t.parent_task_id = s.task_id
      )
      SELECT s.root,
             count(*) AS total,
             count(*) FILTER (WHERE t.status = 'COMPLETED') AS completed
      FROM subtree s JOIN tasks t ON t.task_id = s.task_id
      WHERE s.task_id <> s.root
      GROUP BY s.root`;
    for (const row of rows) {
      counts.set(Number(row.root), {
        total: Number(row.total),
        completed: Number(row.completed),
      });
    }
    return counts;
  }

  async findTopAssignees(scope: TaskScope, limit: number) {
    const grouped = await this.prisma.tasks.groupBy({
      by: ["assigned_to"],
      where: {
        AND: [
          this.where(scope),
          { status: "COMPLETED", assigned_to: { not: null } },
        ],
      },
      _count: { _all: true },
      orderBy: [{ _count: { assigned_to: "desc" } }, { assigned_to: "asc" }],
      take: limit,
    });
    const ids = grouped.map((row) => Number(row.assigned_to));
    const users = await this.prisma.users.findMany({
      where: { user_id: { in: ids } },
      select: { user_id: true, firstname: true, lastname: true },
    });
    return grouped.flatMap((row) => {
      const user = users.find((u) => u.user_id === row.assigned_to);
      return user ? [{ ...user, completed: row._count._all }] : [];
    });
  }

  findTrendRows(scope: TaskScope, since: Date) {
    return this.prisma.tasks.findMany({
      where: {
        AND: [
          this.where(scope),
          {
            OR: [
              { created_at: { gte: since } },
              { updated_at: { gte: since } },
            ],
          },
        ],
      },
      select: { created_at: true, updated_at: true, status: true },
    });
  }
}
