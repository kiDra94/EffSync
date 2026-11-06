import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TaskMembersService, TaskPermissionFlags } from './task-members.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TaskMembersService - Bitwise Permission Checks (rwx-Modell)', () => {
  let service: TaskMembersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskMembersService,
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

  describe('Scenario 1: User mit nur READ-Permission (4)', () => {
    it('sollte READ-Check bestehen', async () => {
      const userId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999, // Nicht der User
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 5,
            name: 'read_task',
            flags: TaskPermissionFlags.READ, // 4
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.READ);
      expect(result).toBe(true);
    });

    it('sollte WRITE-Check fehlschlagen', async () => {
      const userId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 5,
            name: 'read_task',
            flags: TaskPermissionFlags.READ, // 4 (nur READ)
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.WRITE);
      expect(result).toBe(false);
    });

    it('sollte EXECUTE-Check fehlschlagen', async () => {
      const userId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 5,
            name: 'read_task',
            flags: TaskPermissionFlags.READ, // 4 (nur READ)
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.EXECUTE);
      expect(result).toBe(false);
    });
  });

  describe('Scenario 2: User mit READ + WRITE Permission (6)', () => {
    it('sollte READ-Check bestehen', async () => {
      const userId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 6,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 6,
            name: 'edit_task',
            flags: TaskPermissionFlags.READ | TaskPermissionFlags.WRITE, // 6 (READ + WRITE)
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.READ);
      expect(result).toBe(true);
    });

    it('sollte WRITE-Check bestehen', async () => {
      const userId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 6,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 6,
            name: 'edit_task',
            flags: TaskPermissionFlags.READ | TaskPermissionFlags.WRITE, // 6
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.WRITE);
      expect(result).toBe(true);
    });

    it('sollte EXECUTE-Check fehlschlagen', async () => {
      const userId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 6,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 6,
            name: 'edit_task',
            flags: 6, // READ + WRITE, keine EXECUTE
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.EXECUTE);
      expect(result).toBe(false);
    });
  });

  describe('Scenario 3: vollständiger Zugriff (RWX = 7)', () => {
    it('sollte alle Permission-Checks bestehen', async () => {
      const userId = 3;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 7,
          valid_from: new Date(Date.now() - 1000),
          valid_to: new Date(Date.now() + 1000),
          permissions: {
            permission_id: 7,
            name: 'admin',
            flags: TaskPermissionFlags.RWX, // 7 (RWX)
          },
        } as any,
      ]);

      expect(await service.checkPermission(userId, taskId, TaskPermissionFlags.READ)).toBe(true);
      expect(await service.checkPermission(userId, taskId, TaskPermissionFlags.WRITE)).toBe(true);
      expect(await service.checkPermission(userId, taskId, TaskPermissionFlags.EXECUTE)).toBe(true);
      expect(await service.checkPermission(userId, taskId, 6)).toBe(true); // R + W
      expect(await service.checkPermission(userId, taskId, 7)).toBe(true); // R + W + X
    });
  });

  describe('Scenario 4: Task-Creator hat automatisch vollständigen Zugriff', () => {
    it('sollte RWX-Check bestehen auch ohne explizite Permission', async () => {
      const creatorId = 10;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: creatorId, // Creator!
        assigned_to: null,
      } as any);

      // Keine Permissions nötig, Creator hat implizit alles
      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([]);

      expect(await service.checkPermission(creatorId, taskId, TaskPermissionFlags.READ)).toBe(true);
      expect(await service.checkPermission(creatorId, taskId, TaskPermissionFlags.WRITE)).toBe(true);
      expect(await service.checkPermission(creatorId, taskId, TaskPermissionFlags.EXECUTE)).toBe(true);
    });
  });

  describe('Scenario 5: Abgelaufene Permission wird ignoriert', () => {
    it('sollte abgelaufene Permission nicht akzeptieren', async () => {
      const userId = 4;
      const taskId = 1;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: new Date(Date.now() - 1000000),
          valid_to: yesterday, // Abgelaufen!
          permissions: {
            permission_id: 5,
            name: 'read_task',
            flags: TaskPermissionFlags.READ,
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.READ);
      expect(result).toBe(false);
    });
  });

  describe('Scenario 6: Zukünftige Permission wird ignoriert', () => {
    it('sollte noch-nicht-gültige Permission nicht akzeptieren', async () => {
      const userId = 5;
      const taskId = 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.user_permissions, 'findMany').mockResolvedValue([
        {
          user_id: userId,
          permission_id: 5,
          valid_from: tomorrow, // Noch nicht gültig!
          valid_to: new Date(Date.now() + 1000000),
          permissions: {
            permission_id: 5,
            name: 'read_task',
            flags: TaskPermissionFlags.READ,
          },
        } as any,
      ]);

      const result = await service.checkPermission(userId, taskId, TaskPermissionFlags.READ);
      expect(result).toBe(false);
    });
  });

  describe('extractPermissions() - Bitweise Extraction', () => {
    it('sollte flags 7 (RWX) korrekt extrahieren', () => {
      const result = service.extractPermissions(7);
      expect(result.read).toBe(true);
      expect(result.write).toBe(true);
      expect(result.execute).toBe(true);
    });

    it('sollte flags 6 (RW) korrekt extrahieren', () => {
      const result = service.extractPermissions(6);
      expect(result.read).toBe(true);
      expect(result.write).toBe(true);
      expect(result.execute).toBe(false);
    });

    it('sollte flags 4 (R) korrekt extrahieren', () => {
      const result = service.extractPermissions(4);
      expect(result.read).toBe(true);
      expect(result.write).toBe(false);
      expect(result.execute).toBe(false);
    });

    it('sollte flags 2 (W) korrekt extrahieren', () => {
      const result = service.extractPermissions(2);
      expect(result.read).toBe(false);
      expect(result.write).toBe(true);
      expect(result.execute).toBe(false);
    });

    it('sollte flags 1 (X) korrekt extrahieren', () => {
      const result = service.extractPermissions(1);
      expect(result.read).toBe(false);
      expect(result.write).toBe(false);
      expect(result.execute).toBe(true);
    });

    it('sollte flags 0 (keine) korrekt extrahieren', () => {
      const result = service.extractPermissions(0);
      expect(result.read).toBe(false);
      expect(result.write).toBe(false);
      expect(result.execute).toBe(false);
    });
  });

  describe('computeFlags() - Bitweise Berechnung', () => {
    it('sollte R+W+X zu 7 berechnen', () => {
      const result = service.computeFlags({ read: true, write: true, execute: true });
      expect(result).toBe(7);
    });

    it('sollte R+W zu 6 berechnen', () => {
      const result = service.computeFlags({ read: true, write: true });
      expect(result).toBe(6);
    });

    it('sollte R zu 4 berechnen', () => {
      const result = service.computeFlags({ read: true });
      expect(result).toBe(4);
    });

    it('sollte W zu 2 berechnen', () => {
      const result = service.computeFlags({ write: true });
      expect(result).toBe(2);
    });

    it('sollte X zu 1 berechnen', () => {
      const result = service.computeFlags({ execute: true });
      expect(result).toBe(1);
    });

    it('sollte nichts zu 0 berechnen', () => {
      const result = service.computeFlags({});
      expect(result).toBe(0);
    });
  });

  describe('isMember() - Implizite und explizite Mitgliedschaften', () => {
    it('sollte Creator als implizites Mitglied erkennen', async () => {
      const creatorId = 1;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: creatorId,
        assigned_to: null,
      } as any);

      const result = await service.isMember(taskId, creatorId);
      expect(result).toBe(true);
    });

    it('sollte assigned-to-User als implizites Mitglied erkennen', async () => {
      const assignedId = 2;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: assignedId,
      } as any);

      const result = await service.isMember(taskId, assignedId);
      expect(result).toBe(true);
    });

    it('sollte explizites Mitglied erkennen', async () => {
      const userId = 3;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.task_members, 'findUnique').mockResolvedValue({
        task_id: taskId,
        user_id: userId,
        joined_at: new Date(),
      } as any);

      const result = await service.isMember(taskId, userId);
      expect(result).toBe(true);
    });

    it('sollte Nicht-Mitglied erkennen', async () => {
      const userId = 3;
      const taskId = 1;

      jest.spyOn(prisma.tasks, 'findUnique').mockResolvedValue({
        task_id: taskId,
        created_by: 999,
        assigned_to: null,
      } as any);

      jest.spyOn(prisma.task_members, 'findUnique').mockResolvedValue(null);

      const result = await service.isMember(taskId, userId);
      expect(result).toBe(false);
    });
  });

  // Moved from backend/test/task-members.service.spec.ts, which no jest config picked up (GOALS.md M2, T127).
  describe('addMember', () => {
    const taskId = 10;
    const userId = 8;
    const requesterId = 5;

    it('should add member if requester is task creator', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: requesterId, // Requester is creator
      });

      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        user_id: userId,
        firstname: 'John',
      });

      (prisma.task_members.findUnique as jest.Mock).mockResolvedValue(null);

      const createSpy = jest.spyOn(prisma.task_members, 'create').mockResolvedValue({
        task_id: taskId,
        user_id: userId,
      } as any);

      const result = await service.addMember(taskId, userId, requesterId);

      expect(result).toEqual({ task_id: taskId, user_id: userId });
      expect(createSpy).toHaveBeenCalledWith({ data: { task_id: taskId, user_id: userId } });
    });

    it('should throw NotFoundException if task does not exist', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addMember(taskId, userId, requesterId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester has no permission', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 99, // Different creator
      });

      (prisma.user_permissions.findMany as jest.Mock).mockResolvedValue([]);

      const findUserSpy = jest.spyOn(prisma.users, 'findUnique');

      await expect(
        service.addMember(taskId, userId, requesterId)
      ).rejects.toThrow('Sie haben keine Berechtigung, Mitglieder hinzuzufügen');
      // the permission check runs before the target user is looked up
      expect(findUserSpy).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is already member', async () => {
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
        service.addMember(taskId, userId, requesterId)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
