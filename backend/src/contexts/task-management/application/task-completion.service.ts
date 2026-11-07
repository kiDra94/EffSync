import { Injectable } from "@nestjs/common";
import { isRoleIn, RoleName } from "../../identity-access/application";
import {
  ConditionNode,
  evaluateCondition,
  ruleContainsTask,
} from "../domain/completion-rule";
import { TaskRealtime } from "./ports/task-realtime";
import type { TaskCompletionSnapshot, TaskRecord } from "./ports/task-records";
import { TaskRepository } from "./ports/task.repository";

/** A parent whose status changed, for the realtime event. */
interface ParentChange {
  parent: TaskRecord;
  updated: TaskRecord;
}

/**
 * When tasks complete by themselves: a parent whose completion rule holds
 * (T53), and a task whose student participants all have a graded submission
 * (read-time recalculation, T119; M17 unifies it with grading).
 */
@Injectable()
export class TaskCompletionService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly realtime: TaskRealtime,
  ) {}

  /** Re-evaluates every parent whose completion rule refers to the task. */
  async checkAndAutoComplete(childTaskId: number) {
    this.notify(await this.completeParentsOf(childTaskId));
  }

  /**
   * Updates the parents whose completion rule refers to the task and returns
   * the realtime events, to send once the use case has committed.
   */
  async completeParentsOf(childTaskId: number): Promise<ParentChange[]> {
    const changes: ParentChange[] = [];
    const affectedParents = (await this.tasks.findWithCompletionRule()).filter(
      (task) =>
        ruleContainsTask(
          task.completion_rule as ConditionNode | null,
          String(childTaskId),
        ),
    );

    for (const parent of affectedParents) {
      if (!parent.auto_complete) continue;

      const completedIds = new Set(
        (await this.tasks.findCompletedChildIds(parent.task_id)).map(String),
      );
      const isFulfilled = evaluateCondition(
        parent.completion_rule as ConditionNode,
        completedIds,
      );

      if (isFulfilled && parent.status !== "COMPLETED") {
        const updated = await this.tasks.updateRow(parent.task_id, {
          status: "COMPLETED",
          progress: 100,
        });
        changes.push({ parent, updated });
      } else if (!isFulfilled && parent.status === "COMPLETED") {
        const updated = await this.tasks.updateRow(parent.task_id, {
          status: "IN_PROGRESS",
        });
        changes.push({ parent, updated });
      }
    }
    return changes;
  }

  /** Sends the realtime update of each changed parent to its assignee and creator. */
  notify(changes: ParentChange[]) {
    for (const { parent, updated } of changes) {
      this.notifyTaskUpdate(parent, updated);
    }
  }

  /**
   * Retroactive completion: if every student participant of the task has at
   * least one graded submission for it, the task becomes COMPLETED.
   *
   * @returns true if this run changed the status to COMPLETED.
   */
  async recalculateFromGrades(
    taskId: number,
    taskSnapshot?: TaskCompletionSnapshot,
  ): Promise<boolean> {
    const task =
      taskSnapshot ?? (await this.tasks.findCompletionSnapshot(taskId));
    if (!task || task.status === "COMPLETED") return false;

    const participantIds = new Set<number>();
    if (task.created_by) participantIds.add(Number(task.created_by));
    if (task.assigned_to) participantIds.add(Number(task.assigned_to));
    for (const memberId of await this.tasks.findMemberIds(taskId)) {
      if (memberId) participantIds.add(Number(memberId));
    }
    if (participantIds.size === 0) return false;

    const studentParticipantIds = (
      await this.tasks.findParticipantProfiles(Array.from(participantIds))
    )
      .filter((user) => {
        const hasStudentProfile = Boolean(user.students?.student_id);
        const hasStudentRole = Array.isArray(user.user_roles)
          ? user.user_roles.some((entry) =>
              isRoleIn(entry.roles?.name, [RoleName.STUDENT]),
            )
          : false;
        return hasStudentProfile || hasStudentRole;
      })
      .map((user) => Number(user.user_id));
    if (studentParticipantIds.length === 0) return false;

    const gradedStudentIds = new Set(
      (
        await this.tasks.findGradedSubmissionAuthors(
          studentParticipantIds,
          taskId,
        )
      )
        .map((addedBy) => Number(addedBy))
        .filter((id) => Number.isFinite(id) && id > 0),
    );
    if (!studentParticipantIds.every((id) => gradedStudentIds.has(id))) {
      return false;
    }

    await this.tasks.updateRow(taskId, {
      status: "COMPLETED",
      progress: 100,
      updated_at: new Date(),
    });
    return true;
  }

  private notifyTaskUpdate(parent: TaskRecord, updated: TaskRecord) {
    if (parent.assigned_to) {
      this.realtime.emitTaskUpdated(parent.assigned_to, updated);
    }
    if (parent.created_by && parent.created_by !== parent.assigned_to) {
      this.realtime.emitTaskUpdated(parent.created_by, updated);
    }
  }
}
