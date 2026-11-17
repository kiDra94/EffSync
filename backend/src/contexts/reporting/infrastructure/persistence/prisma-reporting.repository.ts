import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import {
  taskScopeSql,
  withRecursive,
} from "../../../../shared/infrastructure/prisma/task-scope.sql";
import {
  ReportingRepository,
  type StatusCount,
  type TaskScope,
  type TaskStatRow,
} from "../../application/ports/reporting.repository";
import type { SubtreeCount } from "../../domain/projects";

/**
 * A JS date against the `timestamp` columns, which hold UTC (Prisma's
 * convention). Sent as ISO text with its Z: the driver sends a bare Date
 * without an offset, which ::timestamptz reads in the session's time zone
 * (review M37).
 */
const utc = (date: Date) =>
  Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;

/**
 * Read-only statistics on Prisma (M24, MetricsService before). M37: every
 * query filters by the scope in SQL, so a student's visible set stays in
 * the database, and the counts are aggregated there.
 */
@Injectable()
export class PrismaReportingRepository extends ReportingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /** `<WITH …> <select> FROM tasks t WHERE <scope> AND <conditions> <rest>` */
  private scoped(
    scope: TaskScope,
    select: Prisma.Sql,
    conditions: Prisma.Sql[] = [],
    rest: Prisma.Sql = Prisma.empty,
  ) {
    const { cte, where } = taskScopeSql(scope);
    return Prisma.sql`${withRecursive(cte)}
      SELECT ${select} FROM tasks t
      WHERE ${Prisma.join([where, ...conditions], " AND ")} ${rest}`;
  }

  findTasks(scope: TaskScope) {
    return this.prisma.$queryRaw<TaskStatRow[]>(
      this.scoped(
        scope,
        Prisma.sql`t.task_id, t.title, t.status::text AS status, t.deadline, t.progress`,
        [],
        Prisma.sql`ORDER BY t.status ASC, t.task_id ASC`,
      ),
    );
  }

  async countByStatus(scope: TaskScope, now: Date): Promise<StatusCount[]> {
    const rows = await this.prisma.$queryRaw<
      {
        status: string | null;
        overdue: boolean;
        count: bigint;
        progress: bigint;
      }[]
    >(
      this.scoped(
        scope,
        Prisma.sql`t.status::text AS status,
          (t.deadline IS NOT NULL AND t.deadline < ${utc(now)}
            AND t.status IS DISTINCT FROM 'COMPLETED') AS overdue,
          count(*) AS count,
          COALESCE(sum(t.progress), 0) AS progress`,
        [],
        Prisma.sql`GROUP BY 1, 2`,
      ),
    );
    return rows.map((row) => ({
      status: row.status,
      overdue: row.overdue,
      count: Number(row.count),
      progress: Number(row.progress),
    }));
  }

  findActiveProjects(scope: TaskScope) {
    return this.prisma.$queryRaw<
      {
        task_id: number;
        title: string | null;
        deadline: Date | null;
        progress: number | null;
      }[]
    >(
      this.scoped(
        scope,
        Prisma.sql`t.task_id, t.title, t.deadline, t.progress`,
        [
          Prisma.sql`t.parent_task_id IS NULL`,
          Prisma.sql`t.status <> 'COMPLETED'`,
        ],
        Prisma.sql`ORDER BY t.deadline ASC NULLS LAST, t.task_id ASC`,
      ),
    );
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
    const ranked = await this.prisma.$queryRaw<
      { user_id: number; completed: bigint }[]
    >(
      this.scoped(
        scope,
        Prisma.sql`t.assigned_to AS user_id, count(*) AS completed`,
        [
          Prisma.sql`t.status = 'COMPLETED'`,
          Prisma.sql`t.assigned_to IS NOT NULL`,
        ],
        Prisma.sql`GROUP BY t.assigned_to
          ORDER BY completed DESC, t.assigned_to ASC
          LIMIT ${limit}`,
      ),
    );
    const ids = ranked.map((row) => Number(row.user_id));
    const users = await this.prisma.users.findMany({
      where: { user_id: { in: ids } },
      select: { user_id: true, firstname: true, lastname: true },
    });
    return ranked.flatMap((row) => {
      const user = users.find((u) => u.user_id === Number(row.user_id));
      return user ? [{ ...user, completed: Number(row.completed) }] : [];
    });
  }

  findTrendRows(scope: TaskScope, since: Date) {
    return this.prisma.$queryRaw<
      {
        created_at: Date | null;
        updated_at: Date | null;
        status: string | null;
      }[]
    >(
      this.scoped(
        scope,
        Prisma.sql`t.created_at, t.updated_at, t.status::text AS status`,
        [
          Prisma.sql`(t.created_at >= ${utc(since)} OR t.updated_at >= ${utc(since)})`,
        ],
      ),
    );
  }
}
