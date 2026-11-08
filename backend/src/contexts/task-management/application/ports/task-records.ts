/**
 * Row shapes the task-management ports return. They are Prisma's generated
 * types, imported type-only: application code uses them as plain data and
 * never calls Prisma (that is infrastructure's job).
 */
import type { Prisma } from "@prisma/client";

const userSummary = {
  select: { user_id: true, email: true, firstname: true, lastname: true },
} as const;

/** The relations a task is read with (creator, assignee, priority, parent, members). */
type TaskRelations = {
  users_tasks_created_byTousers: typeof userSummary;
  users_tasks_assigned_toTousers: typeof userSummary;
  priorities: true;
  tasks: true;
  task_members: { select: { user_id: true } };
  task_tags: { select: { tags: { select: { tag_id: true; name: true } } } };
};

export type TaskRecord = Prisma.tasksGetPayload<object>;
export type TaskWithRelations = Prisma.tasksGetPayload<{
  include: TaskRelations;
}>;
/** A task read with or without its relations (`includeRelations`). */
export type TaskRow = TaskRecord &
  Partial<Omit<TaskWithRelations, keyof TaskRecord>>;

export type TaskChanges = Prisma.tasksUncheckedUpdateInput;
export type NewTask = Prisma.tasksUncheckedCreateInput;

export type ParentLinkRecord = {
  task_id: number;
  parent_task_id: number | null;
};

export type TaskCompletionSnapshot = Pick<
  TaskRecord,
  "task_id" | "status" | "created_by" | "assigned_to"
>;

export type ParticipantProfile = Prisma.usersGetPayload<{
  select: {
    user_id: true;
    students: { select: { student_id: true } };
    user_roles: { select: { roles: { select: { name: true } } } };
  };
}>;

export type StudentSubmission = Prisma.documentsGetPayload<{
  select: { document_id: true; graded_at: true; grade: true; feedback: true };
}>;

export type DocumentRecord = Prisma.documentsGetPayload<object>;

/** Filters of GET /tasks (QueryTasksDto without the paging). */
export interface TaskListFilter {
  status?: TaskRecord["status"];
  priority_id?: number;
  assigned_to?: number;
  created_by?: number;
  parent_task_id?: number;
  search?: string;
}

export interface TaskPageRequest {
  includeRelations: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  skip: number;
  take: number;
}
