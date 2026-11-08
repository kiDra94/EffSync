import { Injectable } from "@nestjs/common";
import {
  PermissionsService,
  STAFF_ROLES,
} from "../../identity-access/application";
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

  /** The user's visible task ids for GET /tasks; undefined when everything is visible. */
  async visibleIdsFor(userId: number | undefined) {
    if (!userId || (await this.isStaff(userId))) return undefined;
    return this.tasks.findVisibleTaskIds(userId);
  }

  /** Whether the user sees this one task. */
  async isVisible(taskId: number, userId: number) {
    if (await this.isStaff(userId)) return true;
    return this.tasks.isVisibleTo(taskId, userId);
  }
}
