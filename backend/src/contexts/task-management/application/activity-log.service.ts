import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ActivityLogRepository,
  NewActivityEntry,
} from "./ports/activity-log.repository";
import { TaskRepository } from "./ports/task.repository";

interface AuditLogFilter {
  userId?: number;
  action?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/**
 * The task activity log (T32, T33). Entries are written inside the task use
 * case's unit of work, so a task change and its entry commit together.
 */
@Injectable()
export class TaskActivityLogService {
  constructor(
    private readonly entries: ActivityLogRepository,
    private readonly tasks: TaskRepository,
  ) {}

  async create(
    entry: NewActivityEntry,
    userId: number,
    includeRelations = true,
  ) {
    if (!(await this.tasks.findById(entry.task_id))) {
      throw new NotFoundException(`Task with ID ${entry.task_id} not found!`);
    }
    return this.entries.append(entry, userId, includeRelations);
  }

  /**
   * The admin audit log across all tasks (UC-32, decision A2): newest first,
   * paginated, filterable by user, action and period, and it keeps the
   * entries of deleted tasks (`task_id` null, decision Q8g).
   */
  async findAll(filter: AuditLogFilter) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const { entries, total } = await this.entries.findPage({
      userId: filter.userId,
      action: filter.action,
      from: filter.from,
      to: filter.to,
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: entries,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
