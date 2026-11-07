import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  GHOST_USER_ID,
  PermissionFlag,
  PermissionsService,
  STAFF_ROLES,
} from "../../identity-access/application";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import {
  buildTree,
  findRootId,
  involvedUsers,
  isCompletionWithoutFullProgress,
  isOwnParent,
  mayChangeLockedTask,
  wouldCreateCycle,
} from "../domain/task";
import { TaskActivityLogService } from "./activity-log.service";
import { ActivityLogRepository } from "./ports/activity-log.repository";
import { CommentRepository } from "./ports/comment.repository";
import type { TaskRecord, TaskRow } from "./ports/task-records";
import { TaskRepository } from "./ports/task.repository";
import { TaskCompletionService } from "./task-completion.service";
import { TaskNotificationsService } from "./task-notifications.service";
import type {
  CreateTaskInput,
  TaskQuery,
  UpdateTaskInput,
} from "./task-inputs";

const COMPLETED_NEEDS_FULL_PROGRESS =
  "Eine Aufgabe kann erst bei 100 % Fortschritt abgeschlossen werden";

/**
 * The task use cases (L1, `11_…:29-31`). Every write runs in one unit of
 * work: the task change and its activity-log entry commit together or not at
 * all (T32).
 */
@Injectable()
export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly activityLog: TaskActivityLogService,
    private readonly activityEntries: ActivityLogRepository,
    private readonly comments: CommentRepository,
    private readonly completion: TaskCompletionService,
    private readonly permissionsService: PermissionsService,
    private readonly unitOfWork: UnitOfWork,
    private readonly notifications: TaskNotificationsService,
  ) {}

  async create(input: CreateTaskInput, userId: number) {
    const {
      parent_task_id,
      created_by: _ignoredCreator,
      priority_id,
      ...taskData
    } = input;

    if (isCompletionWithoutFullProgress(taskData.status, taskData.progress)) {
      throw new BadRequestException(COMPLETED_NEEDS_FULL_PROGRESS);
    }
    assertNotGhostAssignee(taskData.assigned_to);
    if (parent_task_id) {
      const parent = await this.tasks.findById(parent_task_id);
      if (!parent) {
        throw new NotFoundException(
          `Parent task with ID ${parent_task_id} not found!`,
        );
      }
      await this.assertInProjectOf(parent, userId);
    }
    if (priority_id && !(await this.tasks.priorityExists(priority_id))) {
      throw new NotFoundException(
        `Priority task with ID ${priority_id} not found!`,
      );
    }

    const created = await this.unitOfWork.run(async () => {
      const task = await this.tasks.create({
        ...taskData,
        created_by: userId,
        parent_task_id,
        priority_id,
        deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      });
      await this.activityLog.create(
        { task_id: task.task_id, action: `Task created: "${task.title}"` },
        userId,
        false,
      );
      // the creator is a member of their task
      await this.tasks.addMember(task.task_id, userId);
      return task;
    });
    await this.notifications.taskAssigned(created, userId);
    return created;
  }

  /**
   * T41, UC-10, decision Q2 (M16): a subtask belongs to the project of its
   * root task; only that task's creator, assignee and members add to it.
   */
  private async assertInProjectOf(parent: TaskRecord, userId: number) {
    const rootId = parent.parent_task_id
      ? await findRootId(parent.task_id, (id) => this.tasks.findParentLink(id))
      : parent.task_id;
    const root =
      rootId === parent.task_id ? parent : await this.tasks.findById(rootId);
    if (!root) return;
    const members = await this.tasks.findMemberIds(root.task_id);
    if (!involvedUsers(root, members).includes(userId)) {
      throw new ForbiddenException(
        "Only members of the project may add tasks to it",
      );
    }
  }

  async findAll(query: TaskQuery, userId?: number) {
    const {
      sortBy = "created_at",
      sortOrder = "desc",
      page = 1,
      limit = 50,
      includeRelations = false,
      ...filter
    } = query;

    // Teacher, Admin and Superuser see all tasks (for grading); everyone
    // else only their own, assigned and member tasks (and their subtasks)
    const isTeacher = userId
      ? await this.permissionsService.hasAnyRole(userId, STAFF_ROLES)
      : true;
    const restricted = Boolean(userId) && !isTeacher;

    const { tasks, total } = await this.tasks.findPage(
      filter,
      restricted ? userId : undefined,
      {
        includeRelations,
        sortBy,
        sortOrder,
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    let visibleTasks: TaskRow[] = tasks;
    if (restricted) {
      const descendants = await this.collectDescendants(
        tasks.map((task) => Number(task.task_id)),
        includeRelations,
        sortBy,
        sortOrder,
      );
      const merged = new Map<number, TaskRow>();
      for (const task of [...tasks, ...descendants]) {
        merged.set(Number(task.task_id), task);
      }
      visibleTasks = Array.from(merged.values());
    }

    const recalculatedTasks = await Promise.all(
      visibleTasks.map(async (task) =>
        (await this.completion.recalculateFromGrades(task.task_id, task))
          ? { ...task, status: "COMPLETED" as const, progress: 100 }
          : task,
      ),
    );

    const count = restricted ? recalculatedTasks.length : total;
    return {
      data: recalculatedTasks,
      meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  private async collectDescendants(
    parentIds: number[],
    includeRelations: boolean,
    sortBy: string,
    sortOrder: "asc" | "desc",
    visited = new Set<number>(),
  ): Promise<TaskRow[]> {
    const uniqueParentIds = parentIds.filter(
      (id) => Number.isFinite(id) && !visited.has(id),
    );
    if (uniqueParentIds.length === 0) return [];
    uniqueParentIds.forEach((id) => visited.add(id));

    const children = await this.tasks.findChildrenOf(
      uniqueParentIds,
      includeRelations,
      sortBy,
      sortOrder,
    );
    const childIds = children
      .map((child) => Number(child.task_id))
      .filter((id) => Number.isFinite(id));
    const deeper = await this.collectDescendants(
      childIds,
      includeRelations,
      sortBy,
      sortOrder,
      visited,
    );
    return [...children, ...deeper];
  }

  async findOne(taskId: number, includeRelations = true): Promise<TaskRow> {
    const task = await this.tasks.findRow(taskId, includeRelations);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    }

    if (await this.completion.recalculateFromGrades(taskId, task)) {
      return (await this.tasks.findRow(taskId, includeRelations)) ?? task;
    }
    return task;
  }

  /**
   * A task for one student, with whether their submission was graded
   * (feature #27): the task is locked for THIS student only.
   */
  async findOneForStudent(
    taskId: number,
    userId: number,
    includeRelations = true,
  ) {
    const task = await this.findOne(taskId, includeRelations);
    const submissions = await this.tasks.findSubmissionsOf(taskId, userId);
    const hasGradedSubmission = submissions.some(
      (doc) => doc.graded_at !== null,
    );

    return {
      ...task,
      student_submission_status: {
        has_submitted: submissions.length > 0,
        has_graded_submission: hasGradedSubmission,
        submission_count: submissions.length,
        latest_grade:
          submissions
            .filter((doc) => doc.graded_at)
            .map((doc) => doc.grade)
            .pop() || null,
      },
      is_student_submission_locked: hasGradedSubmission,
    };
  }

  async findeOneWithSubtasks(taskId: number, includeRelations = true) {
    const rootTask = await this.tasks.findById(taskId);
    if (!rootTask) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    }
    const allTasks = await this.tasks.findAllByCreator(
      rootTask.created_by,
      includeRelations,
    );
    return buildTree(allTasks, taskId);
  }

  async update(taskId: number, input: UpdateTaskInput, userId?: number) {
    const task = await this.tasks.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }
    if (!mayChangeLockedTask(task, userId)) {
      throw new BadRequestException(
        "Task ist gesperrt und kann nicht bearbeitet werden. Nur der Task-Ersteller kann einen gesperrten Task ändern.",
      );
    }

    const {
      parent_task_id,
      priority_id,
      completion_rule,
      is_locked: _ignoredIsLocked,
      locked_reason: _ignoredLockedReason,
      locked_until: _ignoredLockedUntil,
      ...taskData
    } = input;

    if (parent_task_id !== undefined) {
      if (isOwnParent(taskId, parent_task_id)) {
        throw new BadRequestException("Task cannot be its own parent");
      }
      if (parent_task_id) {
        await this.assertValidParent(taskId, parent_task_id);
        // moving a task under a project adds it to the project (T41, Q2)
        const parent = await this.tasks.findById(parent_task_id);
        if (parent && userId !== undefined) {
          await this.assertInProjectOf(parent, userId);
        }
      }
    }
    assertNotGhostAssignee(input.assigned_to);
    if (
      priority_id !== undefined &&
      priority_id !== null &&
      !(await this.tasks.priorityExists(priority_id))
    ) {
      throw new NotFoundException(`Priority with ID ${priority_id} not found`);
    }
    // T100: also a progress below 100 on a task that stays COMPLETED
    if (
      isCompletionWithoutFullProgress(
        input.status ?? task.status,
        input.progress ?? task.progress,
      )
    ) {
      throw new BadRequestException(COMPLETED_NEEDS_FULL_PROGRESS);
    }

    // completing a task completes all of its subtasks; the recursive reads
    // happen before the transaction, so it stays short
    const descendantIds =
      input.status === "COMPLETED"
        ? await this.getAllDescendantIds(taskId)
        : [];

    const { updated, parentChanges } = await this.unitOfWork.run(async () => {
      const updated = await this.tasks.update(taskId, {
        ...taskData,
        parent_task_id,
        priority_id,
        deadline: taskData.deadline ? new Date(taskData.deadline) : undefined,
        updated_at: new Date(),
        completion_rule: completion_rule
          ? (completion_rule as unknown as Prisma.InputJsonValue)
          : undefined,
      });

      if (descendantIds.length > 0) {
        await this.tasks.completeAll(descendantIds);
      }

      // logged under the task's creator
      if (updated.created_by) {
        await this.activityLog.create(
          {
            task_id: updated.task_id,
            action: `Task updated: "${updated.title}"`,
          },
          updated.created_by,
          false,
        );
      }

      const parentChanges = updated.parent_task_id
        ? await this.completion.completeParentsOf(updated.task_id)
        : [];
      return { updated, parentChanges };
    });
    // announced only after the commit
    this.completion.notify(parentChanges);
    for (const { updated: parent } of parentChanges) {
      await this.notifications.statusChanged(parent, userId);
    }
    if (updated.assigned_to && updated.assigned_to !== task.assigned_to) {
      await this.notifications.taskAssigned(updated, userId ?? 0);
    }
    if (updated.status !== task.status) {
      await this.notifications.statusChanged(updated, userId);
    }
    return updated;
  }

  async remove(taskId: number, requesterId?: number) {
    const task = await this.findOne(taskId, false);

    // the creator may always delete their own task; everyone else needs
    // delete_tasks, directly or through a role (problem 5)
    if (requesterId && task.created_by !== requesterId) {
      const canDelete = await this.permissionsService.hasAnyPermission(
        requesterId,
        ["delete_tasks"],
        PermissionFlag.READ,
      );
      if (!canDelete) {
        throw new ForbiddenException("Missing permission: delete_tasks");
      }
    }

    const subtasksCount = await this.tasks.countSubtasks(taskId);
    if (subtasksCount > 0) {
      throw new BadRequestException(
        `Cannot delete task with ${subtasksCount} subtask(s). Delete subtasks first or reassign them.`,
      );
    }

    // decision Q8g: the delete is logged, and the task's history stays
    await this.unitOfWork.run(async () => {
      await this.activityLog.create(
        { task_id: taskId, action: `Task deleted: "${task.title}"` },
        requesterId ?? task.created_by ?? 0,
        false,
      );
      await this.activityEntries.detachFromTask(taskId);
      await this.tasks.delete(taskId);
    });

    return { message: "Task deleted successfully", task_id: taskId };
  }

  async createSubTask(
    parentTaskID: number,
    input: CreateTaskInput,
    userId: number,
  ) {
    await this.findOne(parentTaskID, false);
    return this.create({ ...input, parent_task_id: parentTaskID }, userId);
  }

  async getSubtasksOfTask(parentID: number, includeRelations = true) {
    await this.findOne(parentID, false);
    return this.tasks.findSubtasks(parentID, includeRelations);
  }

  async changeTaskParent(taskId: number, newParentId: number | null) {
    await this.findOne(taskId, false);
    if (newParentId) {
      await this.findOne(newParentId, false);
      if (isOwnParent(taskId, newParentId)) {
        throw new BadRequestException("Task cannot be its own parent");
      }
      await this.assertNoCycle(taskId, newParentId);
    }
    return this.tasks.update(taskId, {
      parent_task_id: newParentId,
      updated_at: new Date(),
    });
  }

  async getDocuments(taskId: number) {
    await this.findOne(taskId, false);
    return this.tasks.findDocuments(taskId);
  }

  /** The discussion comments, oldest first (decision Q16: `comments`). */
  async getComments(taskId: number) {
    await this.findOne(taskId, false);
    return this.comments.findForTask(taskId);
  }

  async getActivityLog(taskId: number, includeRelations = true) {
    await this.findOne(taskId, false);
    return this.activityEntries.findForTask(taskId, includeRelations);
  }

  private async assertValidParent(taskId: number, parentTaskId: number) {
    if (!(await this.tasks.findById(parentTaskId))) {
      throw new NotFoundException(
        `Parent task with ID ${parentTaskId} not found`,
      );
    }
    await this.assertNoCycle(taskId, parentTaskId);
  }

  private async assertNoCycle(taskId: number, parentTaskId: number) {
    if (
      await wouldCreateCycle(taskId, parentTaskId, (id) =>
        this.tasks.findParentLink(id),
      )
    ) {
      throw new BadRequestException(
        "Circular reference detected: Task cannot be ancestor of itself",
      );
    }
  }

  private async getAllDescendantIds(
    parentTaskId: number,
    visited = new Set<number>(),
  ): Promise<number[]> {
    if (visited.has(parentTaskId)) return [];
    visited.add(parentTaskId);

    let all = await this.tasks.findChildIds(parentTaskId);
    for (const childId of [...all]) {
      all = all.concat(await this.getAllDescendantIds(childId, visited));
    }
    return all;
  }
}

/** The ghost user (M14) is no real person and can't be assigned (M16). */
function assertNotGhostAssignee(assignedTo: number | null | undefined) {
  if (assignedTo === GHOST_USER_ID) {
    throw new BadRequestException(
      "Der Ghost-User kann nicht zugewiesen werden",
    );
  }
}
