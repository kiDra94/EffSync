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

// split from task-members.service.spec.ts in M15 (500-line rule)
describe("TaskMembersService - flags, membership and adding members", () => {
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

  describe("extractPermissions() - Bitweise Extraction", () => {
    it("sollte flags 7 (RWX) korrekt extrahieren", () => {
      const result = service.extractPermissions(7);
      expect(result.read).toBe(true);
      expect(result.write).toBe(true);
      expect(result.execute).toBe(true);
    });

    it("sollte flags 6 (RW) korrekt extrahieren", () => {
      const result = service.extractPermissions(6);
      expect(result.read).toBe(true);
      expect(result.write).toBe(true);
      expect(result.execute).toBe(false);
    });

    it("sollte flags 4 (R) korrekt extrahieren", () => {
      const result = service.extractPermissions(4);
      expect(result.read).toBe(true);
      expect(result.write).toBe(false);
      expect(result.execute).toBe(false);
    });

    it("sollte flags 2 (W) korrekt extrahieren", () => {
      const result = service.extractPermissions(2);
      expect(result.read).toBe(false);
      expect(result.write).toBe(true);
      expect(result.execute).toBe(false);
    });

    it("sollte flags 1 (X) korrekt extrahieren", () => {
      const result = service.extractPermissions(1);
      expect(result.read).toBe(false);
      expect(result.write).toBe(false);
      expect(result.execute).toBe(true);
    });

    it("sollte flags 0 (keine) korrekt extrahieren", () => {
      const result = service.extractPermissions(0);
      expect(result.read).toBe(false);
      expect(result.write).toBe(false);
      expect(result.execute).toBe(false);
    });
  });

  describe("computeFlags() - Bitweise Berechnung", () => {
    it("sollte R+W+X zu 7 berechnen", () => {
      const result = service.computeFlags({
        read: true,
        write: true,
        execute: true,
      });
      expect(result).toBe(7);
    });

    it("sollte R+W zu 6 berechnen", () => {
      const result = service.computeFlags({ read: true, write: true });
      expect(result).toBe(6);
    });

    it("sollte R zu 4 berechnen", () => {
      const result = service.computeFlags({ read: true });
      expect(result).toBe(4);
    });

    it("sollte W zu 2 berechnen", () => {
      const result = service.computeFlags({ write: true });
      expect(result).toBe(2);
    });

    it("sollte X zu 1 berechnen", () => {
      const result = service.computeFlags({ execute: true });
      expect(result).toBe(1);
    });

    it("sollte nichts zu 0 berechnen", () => {
      const result = service.computeFlags({});
      expect(result).toBe(0);
    });
  });

  describe("isMember() - Implizite und explizite Mitgliedschaften", () => {
    it("sollte Creator als implizites Mitglied erkennen", async () => {
      const creatorId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: creatorId,
        assigned_to: null,
      } as never);

      const result = await service.isMember(taskId, creatorId);
      expect(result).toBe(true);
    });

    it("sollte assigned-to-User als implizites Mitglied erkennen", async () => {
      const assignedId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: assignedId,
      } as never);

      const result = await service.isMember(taskId, assignedId);
      expect(result).toBe(true);
    });

    it("sollte explizites Mitglied erkennen", async () => {
      const userId = 3;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.task_members, "findUnique").mockResolvedValue({
        task_id: taskId,
        user_id: userId,
        joined_at: new Date(),
      } as never);

      const result = await service.isMember(taskId, userId);
      expect(result).toBe(true);
    });

    it("sollte Nicht-Mitglied erkennen", async () => {
      const userId = 3;
      const taskId = 1;

      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as never);

      jest.spyOn(prisma.task_members, "findUnique").mockResolvedValue(null);

      const result = await service.isMember(taskId, userId);
      expect(result).toBe(false);
    });
  });

  // Moved from backend/test/task-members.service.spec.ts, which no jest config picked up (GOALS.md M2, T127).
  describe("addMember", () => {
    const taskId = 10;
    const userId = 8;
    const requesterId = 5;

    it("should add member if requester is task creator", async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: requesterId, // Requester is creator
      });

      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        user_id: userId,
        firstname: "John",
      });

      (prisma.task_members.findUnique as jest.Mock).mockResolvedValue(null);

      const createSpy = jest
        .spyOn(prisma.task_members, "create")
        .mockResolvedValue({
          task_id: taskId,
          user_id: userId,
        } as never);

      const result = await service.addMember(taskId, userId, requesterId);

      expect(result).toEqual({ task_id: taskId, user_id: userId });
      expect(createSpy).toHaveBeenCalledWith({
        data: { task_id: taskId, user_id: userId },
      });
    });

    it("should throw NotFoundException if task does not exist", async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addMember(taskId, userId, requesterId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if requester has no permission", async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 99, // Different creator
      });

      (prisma.user_permissions.findMany as jest.Mock).mockResolvedValue([]);

      const findUserSpy = jest.spyOn(prisma.users, "findUnique");

      await expect(
        service.addMember(taskId, userId, requesterId),
      ).rejects.toThrow(
        "Sie haben keine Berechtigung, Mitglieder hinzuzufügen",
      );
      // the permission check runs before the target user is looked up
      expect(findUserSpy).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if user is already member", async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: requesterId,
      });

      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        user_id: userId,
      });

      // User already exists
      (prisma.task_members.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        user_id: userId,
      });

      await expect(
        service.addMember(taskId, userId, requesterId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // review M15 (7, 8): the read check lives in the service and answers 403;
  // the rwx flags take two queries, not six
  describe("findMembersFor and permissionFlags", () => {
    it("answers 403 to someone who is neither member nor has READ", async () => {
      jest.spyOn(prisma.tasks, "findUnique").mockResolvedValue({
        task_id: 1,
        created_by: 9,
        assigned_to: null,
      } as never);
      jest.spyOn(prisma.task_members, "findUnique").mockResolvedValue(null);
      jest.spyOn(prisma.user_permissions, "findMany").mockResolvedValue([]);

      await expect(service.findMembersFor(1, 3)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("computes all rwx flags from one creator and one permission query", async () => {
      const findTask = jest
        .spyOn(prisma.tasks, "findUnique")
        .mockResolvedValue({ created_by: 9 } as never);
      const findPermissions = jest
        .spyOn(prisma.user_permissions, "findMany")
        .mockResolvedValue([
          {
            valid_from: null,
            valid_to: null,
            permissions: { flags: 6 },
          },
        ] as never);

      await expect(service.permissionFlags(3, 1)).resolves.toEqual({
        has_read: true,
        has_write: true,
        has_execute: false,
        permission_flags: 6,
      });
      expect(findTask).toHaveBeenCalledTimes(1);
      expect(findPermissions).toHaveBeenCalledTimes(1);
    });
  });
});
