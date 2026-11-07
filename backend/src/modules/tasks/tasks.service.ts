import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryTasksDto } from "./dto/query-tasks.dto";
import { evaluateCondition, ConditionNode } from "./task.evaluator.completion";
import { Prisma } from "@prisma/client";
import { WebsocketGateway } from "../websocket/websocket.gateway";
import { TaskActivityLogService } from "../task-activity-log/task-activity-log.service";
import {
  PermissionFlag,
  PermissionsService,
} from "../permissions/permissions.service";
import {
  isRoleIn,
  RoleName,
  STAFF_ROLES,
} from "../../config/role-permissions.config";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly activityLogService: TaskActivityLogService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: number) {
    const { parent_task_id, created_by, priority_id, ...taskData } =
      createTaskDto;

    if (parent_task_id) {
      const parentTaskId = await this.prisma.tasks.findUnique({
        where: { task_id: parent_task_id },
      });
      if (!parentTaskId) {
        throw new NotFoundException(
          `Parent task with ID ${parent_task_id} not found!`,
        );
      }
    }
    if (priority_id) {
      const priorityId = await this.prisma.priorities.findUnique({
        where: { priority_id },
      });
      if (!priorityId) {
        throw new NotFoundException(
          `Priority task with ID ${priorityId} not found!`,
        );
      }
    }

    const task = await this.prisma.tasks.create({
      data: {
        ...taskData,
        created_by: userId,
        parent_task_id,
        priority_id,
        deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      },
      include: this.basicInclude(),
    });

    // Log activity
    try {
      await this.activityLogService.create(
        {
          task_id: task.task_id,
          action: `Task created: "${task.title}"`,
        },
        userId,
        false,
      );
    } catch (error) {
      console.error("Failed to log task creation activity:", error);
    }

    // Auto-add creator as task member
    try {
      await this.prisma.task_members.upsert({
        where: { task_id_user_id: { task_id: task.task_id, user_id: userId } },
        update: {},
        create: { task_id: task.task_id, user_id: userId },
      });
    } catch (error) {
      console.error("Failed to add creator as task member:", error);
    }

    return task;
  }

  async findAll(queryDto: QueryTasksDto, userId?: number) {
    const {
      status,
      priority_id,
      assigned_to,
      created_by,
      parent_task_id,
      search,
      sortBy = "created_at",
      sortOrder = "desc",
      page = 1,
      limit = 50,
      includeRelations = false,
    } = queryDto;

    const where: any = {}; // must be named like this because Prisma expects `where`!

    if (status) where.status = status;
    if (priority_id) where.priority_id = priority_id;
    if (assigned_to) where.assigned_to = assigned_to;
    if (created_by) where.created_by = created_by;

    if (parent_task_id !== undefined) {
      where.parent_task_id = parent_task_id === 0 ? null : parent_task_id;
    }

    const searchFilter = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined;

    // **SECURITY**: filter tasks by the user's permissions.
    // Teacher, Admin and Superuser see all tasks (for grading); everyone else
    // only the tasks they created, are assigned to or are a member of.
    const isTeacher = userId
      ? await this.permissionsService.hasAnyRole(userId, STAFF_ROLES)
      : true;
    const visibilityFilter = isTeacher
      ? undefined
      : {
          OR: [
            { created_by: userId },
            { assigned_to: userId },
            { task_members: { some: { user_id: userId } } },
          ],
        };

    // search and visibility are combined with AND (problem 1)
    const filters = [searchFilter, visibilityFilter].filter(Boolean);
    if (filters.length > 0) where.AND = filters;

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.prisma.tasks.findMany({
        where,
        include: includeRelations ? this.basicInclude() : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.tasks.count({ where }),
    ]);

    const collectDescendants = async (
      parentIds: number[],
      visited = new Set<number>(),
    ): Promise<any[]> => {
      const uniqueParentIds = parentIds.filter(
        (id) => Number.isFinite(id) && !visited.has(id),
      );
      if (uniqueParentIds.length === 0) return [];

      uniqueParentIds.forEach((id) => visited.add(id));

      const children = await this.prisma.tasks.findMany({
        where: { parent_task_id: { in: uniqueParentIds } },
        include: includeRelations ? this.basicInclude() : undefined,
        orderBy: { [sortBy]: sortOrder },
      });

      const childIds = children
        .map((child) => Number(child.task_id))
        .filter((id) => Number.isFinite(id));
      const deeperChildren = await collectDescendants(childIds, visited);

      return [...children, ...deeperChildren];
    };

    let visibleTasks = tasks;
    if (userId && !isTeacher) {
      const descendants = await collectDescendants(
        tasks.map((task) => Number(task.task_id)),
      );
      const merged = new Map<number, any>();
      for (const task of [...tasks, ...descendants]) {
        merged.set(Number(task.task_id), task);
      }
      visibleTasks = Array.from(merged.values());
    }

    const recalculatedTasks = await Promise.all(
      visibleTasks.map(async (task) => {
        const changedToCompleted =
          await this.recalculateTaskCompletionFromGrades(task.task_id, task);

        if (changedToCompleted) {
          return {
            ...task,
            status: "COMPLETED",
            progress: 100,
          };
        }

        return task;
      }),
    );

    return {
      data: recalculatedTasks,
      meta: {
        total: userId && !isTeacher ? recalculatedTasks.length : total,
        page,
        limit,
        totalPages: Math.ceil(
          (userId && !isTeacher ? recalculatedTasks.length : total) / limit,
        ),
      },
    };
  }

  async findOne(taskId: number, includeRelations = true) {
    let task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      include: includeRelations ? this.basicInclude() : undefined,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    }

    const changedToCompleted = await this.recalculateTaskCompletionFromGrades(
      taskId,
      task,
    );

    if (changedToCompleted) {
      const refreshedTask = await this.prisma.tasks.findUnique({
        where: { task_id: taskId },
        include: includeRelations ? this.basicInclude() : undefined,
      });

      if (refreshedTask) {
        task = refreshedTask;
      }
    }

    return task;
  }

  /**
   * Feature #27: returns a task for one student, with whether their document was graded
   * If a student submitted their document and it was graded,
   * show the task as locked for THIS student (not globally)
   */
  async findOneForStudent(
    taskId: number,
    userId: number,
    includeRelations = true,
  ) {
    const task = await this.findOne(taskId, includeRelations);

    // Check: did this student submit documents for this task?
    const submissions = await this.prisma.documents.findMany({
      where: {
        task_documents: {
          some: { task_id: taskId },
        },
        added_by: userId, // From THIS student
      },
      select: {
        document_id: true,
        graded_at: true,
        grade: true,
        feedback: true,
      },
    });

    // If at least one document was graded, lock the task FOR THIS STUDENT
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
      // Override is_locked for the frontend: only if THE STUDENT'S DOCUMENT was graded
      is_student_submission_locked: hasGradedSubmission,
    };
  }

  async findeOneWithSubtasks(taskId: number, includeRelations = true) {
    const rootTask = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });
    if (!rootTask) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    }

    const allTasks = await this.prisma.tasks.findMany({
      where: { created_by: rootTask.created_by },
      include: includeRelations ? this.basicInclude() : undefined,
    });

    return this.buildTree(allTasks, taskId);
  }

  async update(taskId: number, updateTaskDto: UpdateTaskDto, userId?: number) {
    // First check if task is locked
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // If task is locked, only allow the creator to edit it
    if (task.is_locked && userId && task.created_by !== userId) {
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
    } = updateTaskDto;

    if (parent_task_id !== undefined) {
      if (parent_task_id === taskId) {
        throw new BadRequestException("Task cannot be its own parent");
      }

      if (parent_task_id) {
        const parentTask = await this.prisma.tasks.findUnique({
          where: { task_id: parent_task_id },
        });
        if (!parentTask) {
          throw new NotFoundException(
            `Parent task with ID ${parent_task_id} not found`,
          );
        }
        await this.validateNoCircularReference(taskId, parent_task_id);
      }
    }

    if (priority_id !== undefined && priority_id !== null) {
      const priority = await this.prisma.priorities.findUnique({
        where: { priority_id },
      });
      if (!priority) {
        throw new NotFoundException(
          `Priority with ID ${priority_id} not found`,
        );
      }
    }

    const updated = await this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        ...taskData,
        parent_task_id,
        priority_id,
        deadline: taskData.deadline ? new Date(taskData.deadline) : undefined,
        updated_at: new Date(),
        completion_rule: completion_rule
          ? (completion_rule as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      include: this.basicInclude(),
    });

    // When a task is set to COMPLETED, all subtasks must be completed as well
    if (updateTaskDto.status === "COMPLETED") {
      const descendantIds = await this.getAllDescendantIds(taskId);
      if (descendantIds.length > 0) {
        await this.prisma.tasks.updateMany({
          where: {
            task_id: { in: descendantIds },
            status: { not: "COMPLETED" },
          },
          data: {
            status: "COMPLETED",
            progress: 100,
            updated_at: new Date(),
          },
        });
      }
    }

    // Log activity
    try {
      if (updated.created_by) {
        await this.activityLogService.create(
          {
            task_id: updated.task_id,
            action: `Task updated: "${updated.title}"`,
          },
          updated.created_by,
          false,
        );
      }
    } catch (error) {
      console.error("Failed to log task update activity:", error);
    }

    if (updated.parent_task_id) {
      await this.checkAndAutoComplete(updated.task_id);
    }

    return updated;
  }

  /**
   * Updates a task's deadline and unlocks it automatically
   * if the task was locked after grading.
   *
   * Teachers use this method to release a task again after grading
   * by setting a new deadline.
   *
   * @param taskId - the task ID
   * @param newDeadline - the new deadline
   * @returns the updated, unlocked task
   */
  async updateDeadlineAndUnlockIfNeeded(
    taskId: number,
    newDeadline: Date,
    userId: number,
  ) {
    const task = await this.findOne(taskId, false);

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // staff, or the task's creator (TaskForm offers unlocking to creators)
    const mayChange =
      Number(task.created_by) === Number(userId) ||
      (await this.permissionsService.hasAnyRole(userId, STAFF_ROLES));
    if (!mayChange) {
      throw new ForbiddenException(
        "Only teachers or the task's creator may change the deadline",
      );
    }

    const updated = await this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        deadline: new Date(newDeadline),
        // Unlock the task automatically if it was locked after grading
        is_locked: false,
        locked_reason: null,
        locked_until: null,
        updated_at: new Date(),
      },
      include: this.basicInclude(),
    });

    console.log(
      `✓ Task ${taskId} Deadline aktualisiert auf ${String(newDeadline)} und entsperrt`,
    );

    // Log activity
    try {
      if (task.created_by) {
        await this.activityLogService.create(
          {
            task_id: updated.task_id,
            action: `Task deadline updated to ${newDeadline.toISOString().split("T")[0]} and unlocked`,
          },
          task.created_by,
          false,
        );
      }
    } catch (error) {
      console.error("Failed to log task deadline update activity:", error);
    }

    return updated;
  }

  async remove(taskId: number, requesterId?: number) {
    const task = await this.findOne(taskId, false);

    // The creator may always delete their own task.
    // Everyone else needs the delete_task(s) permission.
    if (requesterId && task.created_by !== requesterId) {
      const now = new Date();
      const READ_FLAG = 4;
      const permissionNames = ["delete_tasks", "delete_task"];

      const directPermission = await this.prisma.user_permissions.findFirst({
        where: {
          user_id: requesterId,
          permissions: { name: { in: permissionNames } },
        },
        include: { permissions: true },
      });

      let canDelete = false;

      if (directPermission) {
        const isTimeValid =
          (!directPermission.valid_from ||
            now >= directPermission.valid_from) &&
          (!directPermission.valid_to || now <= directPermission.valid_to);

        canDelete =
          isTimeValid &&
          (directPermission.permissions.flags & READ_FLAG) === READ_FLAG;
      }

      if (!canDelete) {
        const rolePermission = await this.prisma.user_roles.findFirst({
          where: {
            user_id: requesterId,
            roles: {
              roles_permissions: {
                some: {
                  permissions: { name: { in: permissionNames } },
                },
              },
            },
          },
          include: {
            roles: {
              include: {
                roles_permissions: {
                  where: {
                    permissions: { name: { in: permissionNames } },
                  },
                  include: { permissions: true },
                },
              },
            },
          },
        });

        if (rolePermission?.roles?.roles_permissions?.length) {
          canDelete = rolePermission.roles.roles_permissions.some(
            (rp) => (rp.permissions.flags & READ_FLAG) === READ_FLAG,
          );
        }
      }

      if (!canDelete) {
        throw new ForbiddenException("Missing permission: delete_tasks");
      }
    }

    const subtasksCount = await this.prisma.tasks.count({
      where: { parent_task_id: taskId },
    });

    if (subtasksCount > 0) {
      throw new BadRequestException(
        `Cannot delete task with ${subtasksCount} subtask(s). Delete subtasks first or reassign them.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // FK NoAction on several relations -> clean up dependent data first
      await tx.task_activity_log.deleteMany({ where: { task_id: taskId } });
      await tx.task_comments.deleteMany({ where: { task_id: taskId } });
      await tx.task_documents.deleteMany({ where: { task_id: taskId } });

      // Detach references instead of hard-deleting other data
      await tx.comments.updateMany({
        where: { task_id: taskId },
        data: { task_id: null },
      });
      await tx.chat_rooms.updateMany({
        where: { task_id: taskId },
        data: { task_id: null },
      });

      await tx.tasks.delete({
        where: { task_id: taskId },
      });
    });

    return {
      message: "Task deleted successfully",
      task_id: taskId,
    };
  }

  async createSubTask(
    parentTaskID: number,
    createTaskDto: CreateTaskDto,
    userId: number,
  ) {
    await this.findOne(parentTaskID, false);
    return this.create(
      { ...createTaskDto, parent_task_id: parentTaskID },
      userId,
    );
  }

  async getSubtasksOfTask(parentID: number, includeRelations = true) {
    await this.findOne(parentID, false);
    return this.prisma.tasks.findMany({
      where: { parent_task_id: parentID },
      include: includeRelations ? this.basicInclude() : undefined,
      orderBy: { created_at: "asc" },
    });
  }

  async changeTaskParent(taskId: number, newParentId: number | null) {
    const task = await this.findOne(taskId, false);

    if (newParentId) {
      await this.findOne(newParentId, false);
      await this.validateNoCircularReference(taskId, newParentId);
      if (taskId === newParentId) {
        throw new BadRequestException("Task cannot be its own parent");
      }
    }

    return this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        parent_task_id: newParentId,
        updated_at: new Date(),
      },
      include: this.basicInclude(),
    });
  }

  async getDocuments(taskId: number) {
    await this.findOne(taskId, false);
    const taskDocuments = await this.prisma.task_documents.findMany({
      where: { task_id: taskId },
      include: {
        documents: true,
      },
    });
    return taskDocuments.map((td) => td.documents);
  }

  async getComments(taskId: number, includeRelations = true) {
    await this.findOne(taskId, false);

    return this.prisma.task_comments.findMany({
      where: { task_id: taskId },
      include: includeRelations ? this.userSelectInclude() : undefined,
      orderBy: { created_at: "asc" },
    });
  }

  async getActivityLog(taskId: number, includeRelations = true) {
    await this.findOne(taskId, false);

    return this.prisma.task_activity_log.findMany({
      where: { task_id: taskId },
      include: includeRelations ? this.userSelectInclude() : undefined,
      orderBy: { timestamp: "desc" },
    });
  }

  async checkAndAutoComplete(childTaskId: number) {
    const affectedParents = await this.findAffectedParents(childTaskId);

    for (const parent of affectedParents) {
      if (!parent.auto_complete) continue;

      const doneTasks = await this.prisma.tasks.findMany({
        where: { parent_task_id: parent.task_id, status: "COMPLETED" },
        select: { task_id: true },
      });
      const completedIds = new Set(doneTasks.map((t) => String(t.task_id)));
      const isFulfilled = evaluateCondition(
        parent.completion_rule as ConditionNode,
        completedIds,
      );

      if (isFulfilled && parent.status !== "COMPLETED") {
        const updated = await this.prisma.tasks.update({
          where: { task_id: parent.task_id },
          data: { status: "COMPLETED", progress: 100 },
        });
        this.notifyTaskUpdate(parent, updated);
      } else if (!isFulfilled && parent.status === "COMPLETED") {
        const updated = await this.prisma.tasks.update({
          where: { task_id: parent.task_id },
          data: { status: "IN_PROGRESS" },
        });
        this.notifyTaskUpdate(parent, updated);
      }
    }
  }

  /**
   * Retroactive completion:
   * If every student participant of a task has at least one graded
   * submission for this task, the task is set to COMPLETED.
   *
   * @returns true if this run changed the status to COMPLETED.
   */
  private async recalculateTaskCompletionFromGrades(
    taskId: number,
    taskSnapshot?: any,
  ): Promise<boolean> {
    const task =
      taskSnapshot ??
      (await this.prisma.tasks.findUnique({
        where: { task_id: taskId },
        select: {
          task_id: true,
          status: true,
          created_by: true,
          assigned_to: true,
        },
      }));

    if (!task || task.status === "COMPLETED") {
      return false;
    }

    const participantIds = new Set<number>();

    if (task.created_by) participantIds.add(Number(task.created_by));
    if (task.assigned_to) participantIds.add(Number(task.assigned_to));

    const explicitMembers = await this.prisma.task_members.findMany({
      where: { task_id: taskId },
      select: { user_id: true },
    });

    for (const member of explicitMembers) {
      if (member.user_id) {
        participantIds.add(Number(member.user_id));
      }
    }

    if (participantIds.size === 0) {
      return false;
    }

    const participantUsers = await this.prisma.users.findMany({
      where: {
        user_id: {
          in: Array.from(participantIds),
        },
      },
      select: {
        user_id: true,
        students: {
          select: {
            student_id: true,
          },
        },
        user_roles: {
          select: {
            roles: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const studentParticipantIds = participantUsers
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

    if (studentParticipantIds.length === 0) {
      return false;
    }

    const gradedSubmissions = await this.prisma.documents.findMany({
      where: {
        added_by: { in: studentParticipantIds },
        graded_at: { not: null },
        task_documents: {
          some: {
            task_id: taskId,
          },
        },
      },
      select: {
        added_by: true,
      },
    });

    const gradedStudentIds = new Set(
      gradedSubmissions
        .map((document) => Number(document.added_by))
        .filter((id) => Number.isFinite(id) && id > 0),
    );

    const allParticipantsGraded = studentParticipantIds.every((id) =>
      gradedStudentIds.has(Number(id)),
    );

    if (!allParticipantsGraded) {
      return false;
    }

    await this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        status: "COMPLETED",
        progress: 100,
        updated_at: new Date(),
      },
    });

    return true;
  }

  private notifyTaskUpdate(parent: any, updated: any) {
    if (parent.assigned_to) {
      this.websocketGateway.emitTaskUpdated(parent.assigned_to, updated);
    }
    if (parent.created_by && parent.created_by !== parent.assigned_to) {
      this.websocketGateway.emitTaskUpdated(parent.created_by, updated);
    }
  }

  private async getAllDescendantIds(
    parentTaskId: number,
    visited = new Set<number>(),
  ): Promise<number[]> {
    if (visited.has(parentTaskId)) return [];
    visited.add(parentTaskId);

    const children = await this.prisma.tasks.findMany({
      where: { parent_task_id: parentTaskId },
      select: { task_id: true },
    });

    let allDescendants: number[] = children.map((child) =>
      Number(child.task_id),
    );

    for (const child of children) {
      const deeperDescendants = await this.getAllDescendantIds(
        Number(child.task_id),
        visited,
      );
      allDescendants = allDescendants.concat(deeperDescendants);
    }

    return allDescendants;
  }

  private basicInclude() {
    return {
      users_tasks_created_byTousers: {
        select: {
          user_id: true,
          email: true,
          firstname: true,
          lastname: true,
        },
      },
      users_tasks_assigned_toTousers: {
        select: {
          user_id: true,
          email: true,
          firstname: true,
          lastname: true,
        },
      },
      priorities: true,
      tasks: true, // parent task
      task_members: {
        select: {
          user_id: true,
        },
      },
    };
  }

  private userSelectInclude() {
    return {
      users: {
        select: {
          user_id: true,
          email: true,
          firstname: true,
          lastname: true,
        },
      },
    };
  }

  private buildTree(allTasks: any[], taskId: number) {
    const taskMap = new Map();

    allTasks.forEach((task) => {
      taskMap.set(task.task_id, { ...task, subtasks: [] });
    });
    taskMap.forEach((task) => {
      const currentTaskId = taskMap.get(task.task_id);
      const parentTaskId = taskMap.get(task.parent_task_id);
      parentTaskId?.subtasks.push(currentTaskId);
    });

    return taskMap.get(taskId);
  }

  private async validateNoCircularReference(
    taskId: number,
    parentTaskId: number,
  ): Promise<void> {
    let currentTask = await this.prisma.tasks.findUnique({
      where: { task_id: parentTaskId },
      select: { task_id: true, parent_task_id: true },
    });

    const visited = new Set<number>([taskId]);

    while (currentTask) {
      if (visited.has(currentTask.task_id)) {
        throw new BadRequestException(
          "Circular reference detected: Task cannot be ancestor of itself",
        );
      }
      visited.add(currentTask.task_id);
      if (!currentTask.parent_task_id) break;
      currentTask = await this.prisma.tasks.findUnique({
        where: { task_id: currentTask.parent_task_id },
        select: { task_id: true, parent_task_id: true },
      });
    }
  }

  private ruleContainsTask(rule: ConditionNode, taskId: string): boolean {
    if (!rule) return false;
    if (rule.type === "leaf") return String(rule.task_id) === String(taskId);
    if (rule.type === "operator") {
      return rule.operands.some((op) => this.ruleContainsTask(op, taskId));
    }
    return false;
  }

  private async findAffectedParents(childTaskId: number) {
    const allTasksWithRule = await this.prisma.tasks.findMany({
      where: { completion_rule: { not: Prisma.JsonNull } },
    });
    return allTasksWithRule.filter((task) =>
      this.ruleContainsTask(
        task.completion_rule as ConditionNode,
        String(childTaskId),
      ),
    );
  }
  /**
   * Feature #27: locks a task automatically when it is overdue
   */
  async lockOverdueTask(
    taskId: number,
    reason: string = "OVERDUE",
  ): Promise<void> {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);

    await this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        is_locked: true,
        locked_reason: reason,
        locked_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // 🚨 Feature #27: send a WebSocket notification to the user
    if (task.assigned_to) {
      this.websocketGateway.emitTaskLocked(task.assigned_to, taskId, reason);
    }
  }

  /**
   * Feature #27: locks a task manually (creator/admin only)
   */
  async lockTask(
    taskId: number,
    reason: string = "MANUAL",
    userId: number,
  ): Promise<void> {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);
    if (task.created_by !== userId) {
      throw new BadRequestException("Only task creator can lock this task");
    }

    await this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        is_locked: true,
        locked_reason: reason,
        locked_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // 🚨 Feature #27: send a WebSocket notification to the user
    if (task.assigned_to) {
      this.websocketGateway.emitTaskLocked(task.assigned_to, taskId, reason);
    }
  }

  /**
   * Feature #27: unlocks a task (creator/admin only)
   */
  async unlockTask(taskId: number, userId: number): Promise<void> {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);
    if (task.created_by !== userId) {
      throw new BadRequestException("Only task creator can unlock this task");
    }

    await this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        is_locked: false,
        locked_reason: null,
        locked_until: null,
      },
    });
  }

  /**
   * Checks whether the task may be edited
   */
  async canEditTask(taskId: number, userId: number): Promise<boolean> {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) return false;
    if (task.is_locked) return false; // Locked = no changes
    if (task.created_by !== userId) return false; // Only the creator may change it

    return true;
  }
}
