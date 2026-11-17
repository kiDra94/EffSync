import { Injectable } from "@nestjs/common";
import { TaskRepository } from "./ports/task.repository";

/**
 * Reopens a task for a new submission after grading (documents-notes,
 * M19): unlocked, with the new deadline if there is one.
 */
@Injectable()
export class TaskResubmissionService {
  constructor(private readonly tasks: TaskRepository) {}

  async reopen(
    task: { task_id: number; deadline: Date | null },
    newDeadline?: Date,
  ) {
    await this.tasks.updateRow(task.task_id, {
      is_locked: false,
      locked_reason: null,
      // BUG (fixed in M19): the unlocked task was "locked until" the new deadline
      locked_until: null,
      deadline: newDeadline || task.deadline,
    });
  }
}
