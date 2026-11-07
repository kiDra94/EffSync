import { Test, TestingModule } from "@nestjs/testing";
import { TasksService } from "./tasks.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { WebsocketGateway } from "../websocket/websocket.gateway";
import { TaskActivityLogService } from "../task-activity-log/task-activity-log.service";
import { PermissionsService } from "../permissions/permissions.service";

describe("TasksService", () => {
  let service: TasksService;

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
    },
    users: {
      findMany: jest.fn(),
    },
    documents: {
      findMany: jest.fn(),
    },
    user_roles: {
      findMany: jest.fn(),
    },
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
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebsocketGateway, useValue: {} },
        { provide: TaskActivityLogService, useValue: { create: jest.fn() } },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
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
      { added_by: 21 },
      { added_by: 22 },
    ]);
    mockPrismaService.tasks.update.mockResolvedValue({
      task_id: 10,
      status: "COMPLETED",
    });

    const result = await service.findOne(10, false);

    expect(mockPrismaService.tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: 10 },
        data: expect.objectContaining({
          status: "COMPLETED",
          progress: 100,
        }),
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
      { added_by: 31 },
      { added_by: 32 },
    ]);
    mockPrismaService.tasks.update.mockResolvedValue({
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
    mockPrismaService.tasks.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        { 1: [{ task_id: 2 }, { task_id: 3 }], 2: [{ task_id: 4 }] }[
          where.parent_task_id
        ] ?? [],
      ),
    );

    mockPrismaService.tasks.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.update(1, { status: "COMPLETED" }, 99);

    expect(result.status).toBe("COMPLETED");
    expect(mockPrismaService.tasks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          task_id: { in: [2, 3, 4] },
          status: { not: "COMPLETED" },
        }),
        data: expect.objectContaining({
          status: "COMPLETED",
          progress: 100,
        }),
      }),
    );
  });
});
