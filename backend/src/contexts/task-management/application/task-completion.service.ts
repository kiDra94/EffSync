import { Injectable } from "@nestjs/common";
import { isRoleIn, RoleName } from "../../identity-access/application";
import { involvedUsersOf } from "./involved-users";
import { involvedUsers } from "../domain/task";
import { TaskNotificationsService } from "./task-notifications.service";
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
  updated: TaskRecord;
  /** creator, assignee and members of the parent (T107) */
  recipients: number[];
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
    private readonly notifications: TaskNotificationsService,
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
        changes.push({ updated, recipients: await this.recipientsOf(parent) });
      } else if (!isFulfilled && parent.status === "COMPLETED") {
        const updated = await this.tasks.updateRow(parent.task_id, {
          status: "IN_PROGRESS",
        });
        changes.push({ updated, recipients: await this.recipientsOf(parent) });
      }
    }
    return changes;
  }

  /** Sends the realtime update of each changed parent to everyone involved (T107). */
  notify(changes: ParentChange[]) {
    for (const { updated, recipients } of changes) {
      for (const userId of recipients) {
        this.realtime.emitTaskUpdated(userId, updated);
      }
    }
  }

  private recipientsOf(parent: TaskRecord) {
    return involvedUsersOf(this.tasks, parent);
  }

  /**
   * Completion from grades (T119, problems 2 and 3): a task becomes COMPLETED
   * once every student participant (creator, assignee or member with a
   * student profile or the Student role) has a graded submission for it.
   * The one implementation for grading (documents) and the read paths; it
   * needs four queries for any number of tasks.
   *
   * @returns the ids of the tasks this call completed.
   */
  async completeIfAllStudentsGraded(
    tasks: TaskCompletionSnapshot[],
  ): Promise<Set<number>> {
    const open = tasks.filter((task) => task.status !== "COMPLETED");
    if (open.length === 0) return new Set();
    const openIds = open.map((task) => task.task_id);

    // the participants of each task: creator, assignee and members
    const membersOf = new Map<number, number[]>(openIds.map((id) => [id, []]));
    for (const member of await this.tasks.findMembersOf(openIds)) {
      if (member.user_id) membersOf.get(member.task_id)?.push(member.user_id);
    }
    const participants = new Map<number, Set<number>>(
      open.map((task) => [
        task.task_id,
        new Set(involvedUsers(task, membersOf.get(task.task_id) ?? [])),
      ]),
    );
    const everyone = new Set(
      [...participants.values()].flatMap((ids) => [...ids]),
    );
    if (everyone.size === 0) return new Set();

    const students = new Set(
      (await this.tasks.findParticipantProfiles([...everyone]))
        .filter(
          (user) =>
            Boolean(user.students?.student_id) ||
            (Array.isArray(user.user_roles) &&
              user.user_roles.some((entry) =>
                isRoleIn(entry.roles?.name, [RoleName.STUDENT]),
              )),
        )
        .map((user) => Number(user.user_id)),
    );
    if (students.size === 0) return new Set();

    // which student has a graded submission for which task
    const graded = new Set<string>();
    for (const submission of await this.tasks.findGradedSubmissions(
      [...students],
      openIds,
    )) {
      const author = Number(submission.added_by);
      if (!Number.isFinite(author) || author <= 0) continue;
      for (const taskId of submission.taskIds)
        graded.add(`${taskId}:${author}`);
    }

    const completed = open
      .map((task) => task.task_id)
      .filter((taskId) => {
        const studentIds = [...(participants.get(taskId) ?? [])].filter((id) =>
          students.has(id),
        );
        return (
          studentIds.length > 0 &&
          studentIds.every((id) => graded.has(`${taskId}:${id}`))
        );
      });
    if (completed.length > 0) await this.tasks.completeTasks(completed);
    return new Set(completed);
  }

  /**
   * After a grade (documents): completes the linked tasks whose students are
   * all graded, then treats it like any status change: the parents' rules are
   * re-checked (T53), and the people involved get the realtime update and
   * the notification (T107, T72).
   */
  async completeAfterGrading(taskIds: number[]): Promise<void> {
    if (taskIds.length === 0) return;
    const completed = await this.completeIfAllStudentsGraded(
      await this.tasks.findCompletionSnapshots(taskIds),
    );
    for (const taskId of completed) {
      const task = await this.tasks.findById(taskId);
      if (task) await this.notifications.statusChanged(task, undefined);
      const parentChanges = await this.completeParentsOf(taskId);
      this.notify(parentChanges);
      for (const { updated } of parentChanges) {
        await this.notifications.statusChanged(updated, undefined);
      }
    }
  }
}
