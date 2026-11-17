/**
 * Shared setup of the M1 characterization tests for the task use cases
 * (split in M15 along TaskService, TaskLockingService and
 * TaskCompletionService). The services run on the real Prisma repositories
 * over a Prisma mock, so the tests still pin the exact queries (decision G1).
 */
import { PrismaPermissionRepository } from "../../identity-access/infrastructure/persistence/prisma-access.repositories";
import { PermissionsService } from "../../identity-access/application";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaActivityLogRepository } from "../infrastructure/persistence/prisma-activity-log.repository";
import { PrismaCommentRepository } from "../infrastructure/persistence/prisma-comment.repository";
import { PrismaTaskRepository } from "../infrastructure/persistence/prisma-task.repository";
import { TaskActivityLogService } from "./activity-log.service";
import { TaskRealtime } from "./ports/task-realtime";
import { TaskCompletionService } from "./task-completion.service";
import { TaskLockingService } from "./task-locking.service";
import { TaskService } from "./task.service";
import { TaskNotificationsService } from "./task-notifications.service";
import { TaskVisibilityService } from "./task-visibility.service";
import { TaskTemplatesService } from "./task-templates.service";

export type FindManyArgs = {
  where?: {
    parent_task_id?: number | { in?: number[] } | null;
    completion_rule?: unknown;
    status?: string;
  };
};

export function createPrismaMock() {
  const prisma = {
    tasks: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    priorities: { findUnique: jest.fn() },
    task_members: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    users: { findMany: jest.fn().mockResolvedValue([]) },
    documents: { findMany: jest.fn().mockResolvedValue([]) },
    user_roles: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    user_permissions: { findFirst: jest.fn().mockResolvedValue(null) },
    task_documents: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    // M15 (decision Q16): task_comments became task_grade, comments hold the discussion
    task_grade: { deleteMany: jest.fn() },
    task_activity_log: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    comments: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    chat_rooms: { updateMany: jest.fn() },
    // M17: a student's visible set (recursive query)
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );
  return prisma;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export const studentRoles = [{ roles: { name: "Student" } }];
// hasAnyRole counts the user's staff roles (Teacher, Admin, Superuser)
export const teacherRoles = [{ roles: { name: "Teacher" } }];

/** The task services on the Prisma mock, as the module wires them. */
export function createTaskServices(
  prisma: PrismaMock,
  gateway: { emitTaskUpdated: jest.Mock; emitTaskLocked: jest.Mock },
  activityLog: { create: jest.Mock },
) {
  const unitOfWork = new PrismaUnitOfWork(prisma as unknown as PrismaService);
  const tasks = new PrismaTaskRepository(unitOfWork);
  const permissions = new PermissionsService(
    new PrismaPermissionRepository(prisma as unknown as PrismaService),
  );
  const realtime = gateway as unknown as TaskRealtime;
  const log = activityLog as unknown as TaskActivityLogService;
  const notifications = {
    taskAssigned: jest.fn(),
    statusChanged: jest.fn(),
  } as unknown as TaskNotificationsService;
  const completion = new TaskCompletionService(tasks, realtime, notifications);
  const taskService = new TaskService(
    tasks,
    log,
    new PrismaActivityLogRepository(unitOfWork),
    new PrismaCommentRepository(unitOfWork),
    completion,
    permissions,
    unitOfWork,
    // M16: the notifications are covered in task-notifications.service.spec.ts
    notifications,
    new TaskVisibilityService(tasks, permissions),
    // M18: templates have their own spec
    { assertOwner: jest.fn() } as unknown as TaskTemplatesService,
  );
  const locking = new TaskLockingService(
    tasks,
    taskService,
    log,
    realtime,
    permissions,
    unitOfWork,
  );
  return { taskService, locking, completion };
}
