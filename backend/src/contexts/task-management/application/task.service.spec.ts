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

describe("TaskService", () => {
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

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("recalculates and returns COMPLETED task in findOne", async () => {
    mockPrismaService.tasks.findUnique
      .mockResolvedValueOnce({
        task_id: 10,
        title: "Task A",
        status: "IN_PROGRESS",
        progress: 40,
        created_by: 21,
        assigned_to: 22,
      })
      .mockResolvedValueOnce({
        task_id: 10,
        title: "Task A",
        status: "COMPLETED",
        progress: 100,
        created_by: 21,
        assigned_to: 22,
      });

    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: "Student" } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 21, task_documents: [{ task_id: 10 }] },
      { added_by: 22, task_documents: [{ task_id: 10 }] },
    ]);
    mockPrismaService.tasks.updateMany.mockResolvedValue({
      task_id: 10,
      status: "COMPLETED",
    });

    const result = await service.findOne(10, false);

    // M17: one batched update for the completed tasks
    expect(mockPrismaService.tasks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: { in: [10] } },
        data: expect.objectContaining({
          status: "COMPLETED",
          progress: 100,
        }) as unknown,
      }),
    );
    expect(result.status).toBe("COMPLETED");
  });

  it("recalculates task statuses in findAll response", async () => {
    mockPermissionsService.hasAnyRole.mockResolvedValue(true);

    mockPrismaService.tasks.findMany.mockResolvedValue([
      {
        task_id: 11,
        title: "Task B",
        status: "IN_PROGRESS",
        progress: 20,
        created_by: 31,
        assigned_to: 32,
      },
    ]);
    mockPrismaService.tasks.count.mockResolvedValue(1);

    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 31,
        students: { student_id: 31 },
        user_roles: [{ roles: { name: "Student" } }],
      },
      {
        user_id: 32,
        students: { student_id: 32 },
        user_roles: [{ roles: { name: "Student" } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 31, task_documents: [{ task_id: 11 }] },
      { added_by: 32, task_documents: [{ task_id: 11 }] },
    ]);
    mockPrismaService.tasks.updateMany.mockResolvedValue({
      task_id: 11,
      status: "COMPLETED",
    });

    const result = await service.findAll({}, 123);

    expect(result.data[0].status).toBe("COMPLETED");
    expect(result.data[0].progress).toBe(100);
  });

  it("completes all descendant subtasks when task is completed via update", async () => {
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 1,
      status: "IN_PROGRESS",
      is_locked: false,
      created_by: 99,
    });

    mockPrismaService.tasks.update.mockResolvedValue({
      task_id: 1,
      title: "Parent Task",
      status: "COMPLETED",
      created_by: 99,
      parent_task_id: null,
    });

    // Tree: 1 -> [2, 3], 2 -> [4]; all others have no children
    mockPrismaService.tasks.findMany.mockImplementation(
      ({ where }: { where: { parent_task_id: number } }) =>
        Promise.resolve(
          { 1: [{ task_id: 2 }, { task_id: 3 }], 2: [{ task_id: 4 }] }[
            where.parent_task_id
          ] ?? [],
        ),
    );

    mockPrismaService.tasks.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.update(
      1,
      { status: "COMPLETED", progress: 100 },
      99,
    );

    expect(result.status).toBe("COMPLETED");
    expect(mockPrismaService.tasks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          task_id: { in: [2, 3, 4] },
          status: { not: "COMPLETED" },
        }) as unknown,
        data: expect.objectContaining({
          status: "COMPLETED",
          progress: 100,
        }) as unknown,
      }),
    );
  });

  // review M15 (2): a rolled-back update must not have been announced
  it("sends the parent's realtime update only after the transaction committed", async () => {
    let committed = false;
    mockPrismaService.$transaction.mockImplementation(
      async (work: (tx: unknown) => Promise<unknown>) => {
        const result = await work(mockPrismaService);
        committed = true;
        return result;
      },
    );
    realtime.emitTaskUpdated.mockImplementation(() =>
      expect(committed).toBe(true),
    );
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 2,
      is_locked: false,
      created_by: 5,
    });
    mockPrismaService.tasks.update.mockResolvedValue({
      task_id: 2,
      title: "Sub",
      created_by: 5,
      parent_task_id: 1,
      status: "COMPLETED",
    });
    const parent = {
      task_id: 1,
      auto_complete: true,
      status: "IN_PROGRESS",
      created_by: 5,
      assigned_to: null,
      completion_rule: { type: "leaf", task_id: "2" },
    };
    mockPrismaService.tasks.findMany.mockImplementation(
      ({ where }: { where: { completion_rule?: unknown; status?: string } }) =>
        Promise.resolve(
          where.completion_rule
            ? [parent]
            : where.status === "COMPLETED"
              ? [{ task_id: 2 }]
              : [],
        ),
    );

    await service.update(2, { status: "COMPLETED", progress: 100 }, 5);

    expect(realtime.emitTaskUpdated).toHaveBeenCalledTimes(1);
  });

  // review M15 (3): the recursive descendant reads stay out of the transaction
  it("collects the subtasks to complete before the transaction opens", async () => {
    mockPrismaService.tasks.findUnique.mockResolvedValue({
      task_id: 1,
      is_locked: false,
      created_by: 99,
    });
    mockPrismaService.tasks.update.mockResolvedValue({
      task_id: 1,
      title: "Parent",
      created_by: 99,
      parent_task_id: null,
    });
    mockPrismaService.tasks.findMany.mockResolvedValue([]);

    await service.update(1, { status: "COMPLETED", progress: 100 }, 99);

    expect(
      mockPrismaService.tasks.findMany.mock.invocationCallOrder[0],
    ).toBeLessThan(mockPrismaService.$transaction.mock.invocationCallOrder[0]);
  });

  // THESIS: T119 (M17) – the thesis's own unit test (08_…:84-90). Its listing
  // mocks only findUnique; the participant and grade mocks are what the
  // recalculation reads before it completes the task.
  it("recalculates task status in findOne", async () => {
    mockPrismaService.tasks.findUnique
      .mockResolvedValueOnce({
        task_id: 10,
        status: "IN_PROGRESS",
        created_by: 21,
      })
      .mockResolvedValueOnce({ task_id: 10, status: "COMPLETED" });
    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([
      { user_id: 21, students: { student_id: 21 }, user_roles: [] },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 21, task_documents: [{ task_id: 10 }] },
    ]);
    mockPrismaService.tasks.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.findOne(10, false);

    expect(result.status).toBe("COMPLETED");
  });

  // decision B3 (M17): a student's visible set is paged, sorted and counted
  describe("findAll for a student", () => {
    const visibleIds = Array.from({ length: 25 }, (_, i) => i + 1);

    beforeEach(() => {
      mockPermissionsService.hasAnyRole.mockResolvedValue(false);
      // created, assigned or member tasks plus all their subtasks
      mockPrismaService.$queryRaw.mockResolvedValue(
        visibleIds.map((task_id) => ({ task_id })),
      );
      mockPrismaService.tasks.findMany.mockImplementation(
        ({ skip, take }: { skip: number; take: number }) =>
          Promise.resolve(
            visibleIds
              .slice(skip, skip + take)
              .map((task_id) => ({ task_id, status: "COMPLETED" })),
          ),
      );
      mockPrismaService.tasks.count.mockResolvedValue(25);
    });

    it("returns 10, 10 and 5 of 25 visible tasks with total 25 and 3 pages", async () => {
      const pages: Awaited<ReturnType<TaskService["findAll"]>>[] = [];
      for (const page of [1, 2, 3]) {
        pages.push(await service.findAll({ page, limit: 10 }, 7));
      }

      expect(pages.map((p) => p.data.length)).toEqual([10, 10, 5]);
      for (const p of pages) {
        expect(p.meta).toMatchObject({ total: 25, totalPages: 3 });
      }
      expect(mockPrismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ task_id: { in: visibleIds } }] },
          skip: 10,
          take: 10,
        }),
      );
    });

    it("uses the same number of queries for any page size", async () => {
      const queries = () =>
        [
          mockPrismaService.$queryRaw,
          mockPrismaService.tasks.findMany,
          mockPrismaService.tasks.count,
          mockPrismaService.task_members.findMany,
          mockPrismaService.users.findMany,
          mockPrismaService.documents.findMany,
          mockPrismaService.tasks.updateMany,
        ].reduce((sum, mock) => sum + mock.mock.calls.length, 0);
      mockPrismaService.tasks.findMany.mockImplementation(
        ({ take }: { take: number }) =>
          Promise.resolve(
            visibleIds.slice(0, take).map((task_id) => ({
              task_id,
              status: "IN_PROGRESS",
              created_by: 7,
            })),
          ),
      );
      mockPrismaService.task_members.findMany.mockResolvedValue([]);
      mockPrismaService.users.findMany.mockResolvedValue([]);

      await service.findAll({ limit: 10 }, 7);
      const forTen = queries();
      jest.clearAllMocks();
      mockPrismaService.$queryRaw.mockResolvedValue(
        visibleIds.map((task_id) => ({ task_id })),
      );
      await service.findAll({ limit: 25 }, 7);

      expect(queries()).toBe(forTen);
    });
  });
});
