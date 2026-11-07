import type { Prisma } from "@prisma/client";

type ActivityLogRecord = Prisma.task_activity_logGetPayload<object>;
type ActivityLogWithUser = Prisma.task_activity_logGetPayload<{
  include: {
    users: {
      select: { user_id: true; email: true; firstname: true; lastname: true };
    };
  };
}>;

export interface NewActivityEntry {
  task_id: number;
  action: string;
}

/** Filters of the admin audit log GET /tasks/activity (T33, decision A2). */
export interface ActivityLogQuery {
  userId?: number;
  action?: string;
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

/** The task activity log (port); writes join the use case's unit of work. */
export abstract class ActivityLogRepository {
  abstract append(
    entry: NewActivityEntry,
    userId: number,
    includeRelations: boolean,
  ): Promise<ActivityLogRecord>;
  abstract findForTask(
    taskId: number,
    includeRelations: boolean,
  ): Promise<ActivityLogRecord[]>;
  /** All entries, newest first, including those of deleted tasks. */
  abstract findPage(
    query: ActivityLogQuery,
  ): Promise<{ entries: ActivityLogWithUser[]; total: number }>;
  /** Keeps a deleted task's history: its rows get `task_id = null` (Q8g). */
  abstract detachFromTask(taskId: number): Promise<void>;
}
