import { Test, TestingModule } from "@nestjs/testing";
import { PermissionsService } from "../../identity-access/application";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaActivityLogRepository } from "../infrastructure/persistence/prisma-activity-log.repository";
import { PrismaCommentRepository } from "../infrastructure/persistence/prisma-comment.repository";
import { PrismaTaskRepository } from "../infrastructure/persistence/prisma-task.repository";
import { TaskActivityLogService } from "./activity-log.service";
import { ActivityLogRepository } from "./ports/activity-log.repository";
import { CommentRepository } from "./ports/comment.repository";
import { TaskRealtime } from "./ports/task-realtime";
import { TaskRepository } from "./ports/task.repository";
import { TaskCompletionService } from "./task-completion.service";
import { TaskService } from "./task.service";
import { TaskNotificationsService } from "./task-notifications.service";
import { TaskVisibilityService } from "./task-visibility.service";
import { TaskTemplatesService } from "./task-templates.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

// split from task.service.spec.ts in M17 (500-line rule): the M16 rules
describe("TaskService rules and notifications (M16)", () => {
  let service: TaskService;

  const mockPrismaService = {
    tasks: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    task_members: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    comments: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    users: {
      findMany: jest.fn(),
    },
    documents: {
      findMany: jest.fn(),
    },
    user_roles: {
      findMany: jest.fn(),
    },
    // M15: the use cases run in a unit of work
    $transaction: jest.fn(),
  };
  mockPrismaService.$transaction.mockImplementation(
    (work: (tx: unknown) => unknown) => work(mockPrismaService),
  );

  const realtime = { emitTaskUpdated: jest.fn(), emitTaskLocked: jest.fn() };
  const notifications = {
    taskAssigned: jest.fn().mockResolvedValue(undefined),
    statusChanged: jest.fn().mockResolvedValue(undefined),
  };

  const mockPermissionsService = {
    hasPermission: jest.fn(),
    hasAnyPermission: jest.fn(),
    hasAnyRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        TaskCompletionService,
        TaskVisibilityService,
        { provide: TaskTemplatesService, useValue: { assertOwner: jest.fn() } },
        PrismaUnitOfWork,
        { provide: UnitOfWork, useExisting: PrismaUnitOfWork },
        { provide: TaskRepository, useClass: PrismaTaskRepository },
        {
          provide: ActivityLogRepository,
          useClass: PrismaActivityLogRepository,
        },
        { provide: CommentRepository, useClass: PrismaCommentRepository },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TaskRealtime, useValue: realtime },
        { provide: TaskNotificationsService, useValue: notifications },
        { provide: TaskActivityLogService, useValue: { create: jest.fn() } },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  // T44, T72 (M16): notifications go out after the commit
  it("notifies about a new assignee and a status change after the commit", async () => {
    let committed = false;
    mockPrismaService.$transaction.mockImplementation(
      async (work: (tx: unknown) => Promise<unknown>) => {
        const result = await work(mockPrismaService);
        committed = true;
        return result;
      },
    );
    notifications.statusChanged.mockImplementation(() => {
      expect(committed).toBe(true);
      return Promise.resolve();
    });
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 1,
      status: "TODO",
      assigned_to: null,
      is_locked: false,
      created_by: 5,
    });
    const updated = {
      task_id: 1,
      title: "T",
      status: "IN_PROGRESS",
      assigned_to: 6,
      created_by: 5,
      parent_task_id: null,
    };
    mockPrismaService.tasks.update.mockResolvedValue(updated);

    await service.update(1, { status: "IN_PROGRESS", assigned_to: 6 }, 5);

    expect(notifications.taskAssigned).toHaveBeenCalledWith(updated, 5);
    expect(notifications.statusChanged).toHaveBeenCalledWith(updated, 5);
  });

  it("sends no notification when neither the assignee nor the status changes", async () => {
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 1,
      status: "TODO",
      assigned_to: 6,
      is_locked: false,
      created_by: 5,
    });
    mockPrismaService.tasks.update.mockResolvedValue({
      task_id: 1,
      title: "neu",
      status: "TODO",
      assigned_to: 6,
      created_by: 5,
    });

    await service.update(
      1,
      { title: "neu", status: "TODO", assigned_to: 6 },
      5,
    );

    expect(notifications.taskAssigned).not.toHaveBeenCalled();
    expect(notifications.statusChanged).not.toHaveBeenCalled();
  });

  // T100 (M16)
  it("rejects creating a COMPLETED task below 100 %", async () => {
    await expect(
      service.create(
        {
          title: "A",
          deadline: "2026-12-01",
          status: "COMPLETED",
          progress: 50,
        },
        5,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.tasks.create).not.toHaveBeenCalled();
  });

  it("rejects a progress below 100 on a COMPLETED task", async () => {
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 1,
      status: "COMPLETED",
      progress: 100,
      is_locked: false,
      created_by: 5,
    });

    await expect(service.update(1, { progress: 80 }, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  // T41, UC-10, decision Q2 (M16): a subtask belongs to the root task's project
  describe("creating a subtask", () => {
    beforeEach(() => {
      // 3 -> 2 -> 1 (root, created by 5, assigned to 6, member 7)
      mockPrismaService.tasks.findUnique.mockImplementation(
        ({ where }: { where: { task_id: number } }) =>
          Promise.resolve(
            {
              1: {
                task_id: 1,
                parent_task_id: null,
                created_by: 5,
                assigned_to: 6,
              },
              2: {
                task_id: 2,
                parent_task_id: 1,
                created_by: 7,
                assigned_to: null,
              },
              3: {
                task_id: 3,
                parent_task_id: 2,
                created_by: 7,
                assigned_to: null,
              },
            }[where.task_id] ?? null,
          ),
      );
      mockPrismaService.task_members.findMany.mockResolvedValue([
        { user_id: 7 },
      ]);
      mockPrismaService.tasks.create.mockResolvedValue({
        task_id: 9,
        title: "S",
      });
    });

    it("answers 403 to someone who is neither creator, assignee nor member of the root task", async () => {
      await expect(
        service.create(
          { title: "S", deadline: "2026-12-01", parent_task_id: 3 },
          8,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.tasks.create).not.toHaveBeenCalled();
    });

    it.each([5, 6, 7])(
      "lets user %s of the root task create it",
      async (userId) => {
        await service.create(
          { title: "S", deadline: "2026-12-01", parent_task_id: 3 },
          userId,
        );
        expect(mockPrismaService.tasks.create).toHaveBeenCalled();
      },
    );
  });

  // review M16 (1): moving a task under a project is adding it to the project
  it("answers 403 when an outsider moves a task under someone else's project", async () => {
    mockPrismaService.tasks.findUnique.mockImplementation(
      ({ where }: { where: { task_id: number } }) =>
        Promise.resolve(
          {
            1: {
              task_id: 1,
              parent_task_id: null,
              created_by: 5,
              assigned_to: null,
            },
            9: {
              task_id: 9,
              parent_task_id: null,
              created_by: 8,
              assigned_to: null,
              is_locked: false,
            },
          }[where.task_id] ?? null,
        ),
    );
    mockPrismaService.task_members.findMany.mockResolvedValue([]);

    await expect(service.update(9, { parent_task_id: 1 }, 8)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockPrismaService.tasks.update).not.toHaveBeenCalled();
  });

  // review M16 (7): the ghost user is nobody's assignee
  it("answers 400 for the ghost user as assignee", async () => {
    await expect(
      service.create({ title: "A", deadline: "2026-12-01", assigned_to: 0 }, 5),
    ).rejects.toThrow(BadRequestException);
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 1,
      is_locked: false,
      created_by: 5,
    });
    await expect(service.update(1, { assigned_to: 0 }, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  // review M16 (4): an auto-completed parent changes status, too
  it("notifies about the status change of an auto-completed parent", async () => {
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 2,
      status: "COMPLETED",
      progress: 100,
      is_locked: false,
      created_by: 5,
    });
    mockPrismaService.tasks.update.mockImplementation(
      ({ where, data }: { where: { task_id: number }; data: object }) =>
        Promise.resolve(
          where.task_id === 2
            ? {
                task_id: 2,
                title: "Sub",
                status: "COMPLETED",
                created_by: 5,
                parent_task_id: 1,
              }
            : { task_id: 1, title: "Projekt", created_by: 5, ...data },
        ),
    );
    mockPrismaService.tasks.findMany.mockImplementation(
      ({ where }: { where: { completion_rule?: unknown; status?: string } }) =>
        Promise.resolve(
          where.completion_rule
            ? [
                {
                  task_id: 1,
                  auto_complete: true,
                  status: "IN_PROGRESS",
                  created_by: 5,
                  assigned_to: null,
                  completion_rule: { type: "leaf", task_id: "2" },
                },
              ]
            : where.status === "COMPLETED"
              ? [{ task_id: 2 }]
              : [],
        ),
    );
    mockPrismaService.task_members.findMany.mockResolvedValue([]);

    await service.update(2, { title: "Sub" }, 5);

    expect(notifications.statusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ task_id: 1, status: "COMPLETED" }),
      5,
    );
  });
});
