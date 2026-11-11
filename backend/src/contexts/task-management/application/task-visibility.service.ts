import { Injectable } from "@nestjs/common";
import {
  PermissionsService,
  PRIVILEGED_ROLES,
} from "../../identity-access/application";
import type { TaskScope } from "../../../shared/application/task-scope";
import { TaskRepository } from "./ports/task.repository";

/**
 * Who sees which task (decision B3, M17; decision I5, M38): Admin and
 * Superuser see all tasks; anyone else, teachers included, the tasks they
 * created, are assigned to or are a member of, plus all of their subtasks, so
 * a student's private tasks stay private. TaskVisibilityGuard applies it to
 * every /tasks/:id… route; outside the set a task doesn't exist (404).
 */
@Injectable()
export class TaskVisibilityService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly permissions: PermissionsService,
  ) {}

  private seesAll(userId: number) {
    return this.permissions.hasAnyRole(userId, PRIVILEGED_ROLES);
  }

  /**
   * The tasks GET /tasks and the dashboard read: all for Admin and Superuser
   * (and without a user, as before), else the user's visible set, which the
   * queries resolve inside the database (M37).
   */
  async scopeFor(userId: number | undefined): Promise<TaskScope> {
    if (!userId || (await this.seesAll(userId))) return { all: true };
    return { viewerId: userId };
  }

  /** Whether the user sees this one task. */
  async isVisible(taskId: number, userId: number) {
    if (await this.seesAll(userId)) return true;
    return this.tasks.isVisibleTo(taskId, userId);
  }
}
