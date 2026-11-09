import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PermissionsService,
  STAFF_ROLES,
} from "../../identity-access/application";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { LOCK_DURATION_MS, mayEdit, mayLock } from "../domain/task";
import { TaskActivityLogService } from "./activity-log.service";
import { TaskRealtime } from "./ports/task-realtime";
import { TaskRepository } from "./ports/task.repository";
import { TaskService } from "./task.service";

/** Locking a task (feature #27): overdue, by hand, and unlocking with a new deadline. */
@Injectable()
export class TaskLockingService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly taskService: TaskService,
    private readonly activityLog: TaskActivityLogService,
    private readonly realtime: TaskRealtime,
    private readonly permissionsService: PermissionsService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  /**
   * Sets a new deadline and unlocks the task, e.g. after grading. Staff or
   * the task's creator (TaskForm offers unlocking to creators).
   */
  async updateDeadlineAndUnlockIfNeeded(
    taskId: number,
    newDeadline: Date,
    userId: number,
  ) {
    const task = await this.taskService.findOne(taskId, false);

    const mayChange =
      Number(task.created_by) === Number(userId) ||
      (await this.permissionsService.hasAnyRole(userId, STAFF_ROLES));
    if (!mayChange) {
      throw new ForbiddenException(
        "Only teachers or the task's creator may change the deadline",
      );
    }

    return this.unitOfWork.run(async () => {
      const updated = await this.tasks.update(taskId, {
        deadline: new Date(newDeadline),
        is_locked: false,
        locked_reason: null,
        locked_until: null,
        updated_at: new Date(),
      });
      // under the task's creator, the ghost user 0 too (review M33)
      await this.activityLog.create(
        {
          task_id: updated.task_id,
          action: `Task deadline updated to ${newDeadline.toISOString().split("T")[0]} and unlocked`,
        },
        task.created_by,
        false,
      );
      return updated;
    });
  }

  /** Locks a task automatically when it is overdue. */
  async lockOverdueTask(taskId: number, reason = "OVERDUE"): Promise<void> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);

    await this.lock(taskId, reason);
    if (task.assigned_to) {
      this.realtime.emitTaskLocked(task.assigned_to, taskId, reason);
    }
  }

  /** Locks a task by hand (creator only). */
  async lockTask(taskId: number, reason = "MANUAL", userId: number) {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);
    if (!mayLock(task, userId)) {
      throw new BadRequestException("Only task creator can lock this task");
    }

    await this.lock(taskId, reason);
    if (task.assigned_to) {
      this.realtime.emitTaskLocked(task.assigned_to, taskId, reason);
    }
  }

  /** Unlocks a task (creator only). */
  async unlockTask(taskId: number, userId: number): Promise<void> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);
    if (!mayLock(task, userId)) {
      throw new BadRequestException("Only task creator can unlock this task");
    }

    await this.tasks.updateRow(taskId, {
      is_locked: false,
      locked_reason: null,
      locked_until: null,
    });
  }

  async canEditTask(taskId: number, userId: number): Promise<boolean> {
    const task = await this.tasks.findById(taskId);
    return task ? mayEdit(task, userId) : false;
  }

  private async lock(taskId: number, reason: string) {
    await this.tasks.updateRow(taskId, {
      is_locked: true,
      locked_reason: reason,
      locked_until: new Date(Date.now() + LOCK_DURATION_MS),
    });
  }
}
