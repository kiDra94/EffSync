import { Injectable } from "@nestjs/common";
import {
  PermissionsService,
  STAFF_ROLES,
} from "../../identity-access/application";
import type { TaskScope } from "../../../shared/application/task-scope";
import { TaskRepository } from "./ports/task.repository";

/**
 * Who sees which task (decision B3, M17): staff see all tasks (for grading);
 * a student sees the tasks they created, are assigned to or are a member of,
 * plus all of their subtasks. TaskVisibilityGuard applies it to every
 * /tasks/:id… route; outside the set a task doesn't exist (404).
 */
@Injectable()
export class TaskVisibilityService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly permissions: PermissionsService,
  ) {}

  private isStaff(userId: number) {
    return this.permissions.hasAnyRole(userId, STAFF_ROLES);
  }

  /**
   * The tasks GET /tasks and the dashboard read: all for staff (and without
   * a user, as before), else the user's visible set, which the queries
   * resolve inside the database (M37).
   */
  async scopeFor(userId: number | undefined): Promise<TaskScope> {
    if (!userId || (await this.isStaff(userId))) return { all: true };
    return { viewerId: userId };
  }

  /** Whether the user sees this one task. */
  async isVisible(taskId: number, userId: number) {
    if (await this.isStaff(userId)) return true;
    return this.tasks.isVisibleTo(taskId, userId);
  }
}
