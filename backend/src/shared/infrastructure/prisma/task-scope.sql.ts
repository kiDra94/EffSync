import { Prisma } from "@prisma/client";
import type { TaskScope } from "../../application/task-scope";

/**
 * The scope as SQL, for the task list (task-management) and the dashboard
 * metrics (reporting), so the visible set stays inside the database instead
 * of travelling to Node and back as thousands of ids (M37). `cte` goes into
 * `WITH RECURSIVE` (or is empty), `where` filters the tasks aliased `t`.
 *
 * The same rule for one task, upwards from it, is
 * PrismaTaskRepository.isVisibleTo (TaskVisibilityGuard): change both
 * together; task-visibility.e2e-spec.ts checks the list and the detail.
 */
export function taskScopeSql(scope: TaskScope): {
  cte: Prisma.Sql | null;
  where: Prisma.Sql;
} {
  if ("all" in scope) return { cte: null, where: Prisma.sql`TRUE` };
  if ("none" in scope) return { cte: null, where: Prisma.sql`FALSE` };
  const userId = scope.viewerId;
  return {
    // three index scans instead of one scan of all tasks with OR (M37:
    // 30 instead of 85 ms for 9,000 visible tasks, the same set); UNION
    // (not UNION ALL) stops at a cycle
    cte: Prisma.sql`visible AS (
      SELECT task_id FROM tasks WHERE created_by = ${userId}
      UNION
      SELECT task_id FROM tasks WHERE assigned_to = ${userId}
      UNION
      SELECT task_id FROM task_members WHERE user_id = ${userId}
      UNION
      SELECT c.task_id FROM tasks c
      JOIN visible ON c.parent_task_id = visible.task_id
    )`,
    where: Prisma.sql`t.task_id IN (SELECT task_id FROM visible)`,
  };
}

/** `WITH RECURSIVE <ctes>` for the given CTEs that exist, or nothing. */
export function withRecursive(...ctes: (Prisma.Sql | null)[]): Prisma.Sql {
  const present = ctes.filter((cte): cte is Prisma.Sql => cte !== null);
  return present.length > 0
    ? Prisma.sql`WITH RECURSIVE ${Prisma.join(present, ", ")}`
    : Prisma.empty;
}
