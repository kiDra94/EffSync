import type { ConditionNode } from "../domain/completion-rule";
import type {
  TaskListFilter,
  TaskRecord,
  TaskSortKey,
} from "./ports/task-records";

type TaskStatus = NonNullable<TaskRecord["status"]>;

/** What a create use case needs (CreateTaskDto satisfies it). */
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  progress?: number;
  deadline: string;
  /** ignored: the creator is always the requester */
  created_by?: number;
  assigned_to?: number;
  parent_task_id?: number;
  priority_id?: number;
  /** the requester's own template the task is created from (T110) */
  template_id?: number;
  /** tag names (T59); on update they replace the task's tags */
  tags?: string[];
}

/** What an update use case accepts (UpdateTaskDto satisfies it). */
export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  auto_complete?: boolean;
  /** ignored here: only the lock/unlock use cases change the lock */
  is_locked?: boolean;
  locked_reason?: string;
  locked_until?: Date;
  completion_rule?: ConditionNode | { type: string };
}

/** GET /tasks (QueryTasksDto satisfies it). */
export interface TaskQuery extends TaskListFilter {
  sortBy?: TaskSortKey;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeRelations?: boolean;
}
