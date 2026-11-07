import { Test, TestingModule } from "@nestjs/testing";
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  TaskMembersService,
  TaskPermissionFlags,
} from "./task-members.service";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaTaskMemberRepository } from "../infrastructure/persistence/prisma-task-member.repository";
import { TaskMemberRepository } from "./ports/task-member.repository";

describe("TaskMembersService - Bitwise Permission Checks (rwx-Modell)", () => {
  let service: TaskMembersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskMembersService,
        PrismaUnitOfWork,
        { provide: TaskMemberRepository, useClass: PrismaTaskMemberRepository },
        {
          provide: PrismaService,
          useValue: {
            tasks: {
              findUnique: jest.fn(),
            },
            users: {
              findUnique: jest.fn(),
            },
            task_members: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
            user_permissions: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TaskMembersService>(TaskMembersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe("Scenario 1: User mit nur READ-Permission (4)", () => {
    it("sollte READ-Check bestehen", async () => {
      const userId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999, // Not the user
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 5,
            name: "read_task",
            flags: TaskPermissionFlags.READ, // 4
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.READ,
      );
      expect(result).toBe(true);
    });

    it("sollte WRITE-Check fehlschlagen", async () => {
      const userId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 5,
            name: "read_task",
            flags: TaskPermissionFlags.READ, // 4 (READ only)
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE,
      );
      expect(result).toBe(false);
    });

    it("sollte EXECUTE-Check fehlschlagen", async () => {
      const userId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 5,
            name: "read_task",
            flags: TaskPermissionFlags.READ, // 4 (READ only)
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.EXECUTE,
      );
      expect(result).toBe(false);
    });
  });

  describe("Scenario 2: User mit READ + WRITE Permission (6)", () => {
    it("sollte READ-Check bestehen", async () => {
      const userId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 6,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 6,
            name: "edit_task",
            flags: TaskPermissionFlags.READ | TaskPermissionFlags.WRITE, // 6 (READ + WRITE)
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.READ,
      );
      expect(result).toBe(true);
    });

    it("sollte WRITE-Check bestehen", async () => {
      const userId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 6,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 6,
            name: "edit_task",
            flags: TaskPermissionFlags.READ | TaskPermissionFlags.WRITE, // 6
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE,
      );
      expect(result).toBe(true);
    });

    it("sollte EXECUTE-Check fehlschlagen", async () => {
      const userId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 6,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 6,
            name: "edit_task",
            flags: 6, // READ + WRITE, no EXECUTE
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.EXECUTE,
      );
      expect(result).toBe(false);
    });
  });

  describe("Scenario 3: vollständiger Zugriff (RWX = 7)", () => {
    it("sollte alle Permission-Checks bestehen", async () => {
      const userId = 3;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 7,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 7,
            name: "admin",
            flags: TaskPermissionFlags.RWX, // 7 (RWX)
          },
        } as never,
      ]);

      expect(
        await service.checkPermission(userId, taskId, TaskPermissionFlags.READ),
      ).toBe(true);
      expect(
        await service.checkPermission(
          userId,
          taskId,
          TaskPermissionFlags.WRITE,
        ),
      ).toBe(true);
      expect(
        await service.checkPermission(
          userId,
          taskId,
          TaskPermissionFlags.EXECUTE,
        ),
      ).toBe(true);
      expect(await service.checkPermission(userId, taskId, 6)).toBe(true); // R + W
      expect(await service.checkPermission(userId, taskId, 7)).toBe(true); // R + W + X
    });
  });

  describe("Scenario 4: Task-Creator hat automatisch vollständigen Zugriff", () => {
    it("sollte RWX-Check bestehen auch ohne explizite Permission", async () => {
      const creatorId = 10;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: creatorId, // Creator!
        assigned_to: null,
      } as never);

      // No permissions needed, the creator implicitly has everything
      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([]);

      expect(
        await service.checkPermission(
          creatorId,
          taskId,
          TaskPermissionFlags.READ,
        ),
      ).toBe(true);
      expect(
        await service.checkPermission(
          creatorId,
          taskId,
          TaskPermissionFlags.WRITE,
        ),
      ).toBe(true);
      expect(
        await service.checkPermission(
          creatorId,
          taskId,
          TaskPermissionFlags.EXECUTE,
        ),
      ).toBe(true);
    });
  });

  describe("Scenario 5: Abgelaufene Permission wird ignoriert", () => {
    it("sollte abgelaufene Permission nicht akzeptieren", async () => {
      const userId = 4;
      const taskId = 1;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000000),
          valid_to: yesterday, // Expired!
          permissions: {
            permission_id: 5,
            name: "read_task",
            flags: TaskPermissionFlags.READ,
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.READ,
      );
      expect(result).toBe(false);
    });
  });

  describe("Scenario 6: Zukünftige Permission wird ignoriert", () => {
    it("sollte noch-nicht-gültige Permission nicht akzeptieren", async () => {
      const userId = 5;
      const taskId = 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: tomorrow, // Not valid yet!
          valid_to: new Date(Date.now() + 1000000),
          permissions: {
            permission_id: 5,
            name: "read_task",
            flags: TaskPermissionFlags.READ,
          },
        } as never,
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.READ,
      );
      expect(result).toBe(false);
    });
  });
});
