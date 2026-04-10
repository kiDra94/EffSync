import { Test, TestingModule } from '@nestjs/testing';
import { TaskMembersService, TaskPermissionFlags} from '../src/modules/task-members/task-members.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('TaskMembersService', () => {
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
              create: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
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

      (prisma.task_members.create as jest.Mock).mockResolvedValue({
        task_id: taskId,
        user_id: userId,
      });

      const result = await service.addMember(taskId, userId, requesterId);

      expect(result).toEqual({ task_id: taskId, user_id: userId });
      expect(prisma.task_members.create).toHaveBeenCalled();
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

      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        user_id: userId,
      });

      await expect(
        service.addMember(taskId, userId, requesterId)
      ).rejects.toThrow(ForbiddenException);
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

  describe('isMember', () => {
    const taskId = 10;
    const userId = 8;

    it('should return true if user is creator', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: userId,
        assigned_to: 9,
      });

      const result = await service.isMember(taskId, userId);

      expect(result).toBe(true);
    });

    it('should return true if user is assigned_to', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 5,
        assigned_to: userId,
      });

      const result = await service.isMember(taskId, userId);

      expect(result).toBe(true);
    });

    it('should return true if user is explicit member', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 5,
        assigned_to: 9,
      });

      (prisma.task_members.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        user_id: userId,
      });

      const result = await service.isMember(taskId, userId);

      expect(result).toBe(true);
    });

    it('should return false if user is not member', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 5,
        assigned_to: 9,
      });

      (prisma.task_members.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isMember(taskId, userId);

      expect(result).toBe(false);
    });
  });

  describe('checkPermission', () => {
    const taskId = 10;
    const userId = 8;

    it('should return true if user is creator', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: userId,
      });

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE
      );

      expect(result).toBe(true);
    });

    it('should return true if user has permission with required flags', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 5,
      });

      (prisma.user_permissions.findMany as jest.Mock).mockResolvedValue([
        {
          user_id: userId,
          permission_id: 4,
          valid_from: null,
          valid_to: null,
          permissions: {
            flags: TaskPermissionFlags.RWX, // All flags
          },
        },
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE
      );

      expect(result).toBe(true);
    });

    it('should return false if permission is expired', async () => {
      const now = new Date();

      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 5,
      });

      (prisma.user_permissions.findMany as jest.Mock).mockResolvedValue([
        {
          user_id: userId,
          permission_id: 4,
          valid_from: new Date(now.getTime() - 172800000),
          valid_to: new Date(now.getTime() - 86400000), // Expired 1 day ago
          permissions: {
            flags: TaskPermissionFlags.RWX,
          },
        },
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE
      );

      expect(result).toBe(false);
    });

    it('should return false if flags do not match', async () => {
      (prisma.tasks.findUnique as jest.Mock).mockResolvedValue({
        task_id: taskId,
        created_by: 5,
      });

      (prisma.user_permissions.findMany as jest.Mock).mockResolvedValue([
        {
          user_id: userId,
          permission_id: 6,
          valid_from: null,
          valid_to: null,
          permissions: {
            flags: TaskPermissionFlags.READ, // Only READ
          },
        },
      ]);

      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE
      );

      expect(result).toBe(false);
    });
  });

  describe('extractPermissions', () => {
    it('should extract permissions correctly from flags', () => {
      const result = service.extractPermissions(TaskPermissionFlags.RWX);

      expect(result).toEqual({
        read: true,
        write: true,
        execute: true,
      });
    });

    it('should handle partial flags', () => {
      const rw = TaskPermissionFlags.READ | TaskPermissionFlags.WRITE;
      const result = service.extractPermissions(rw);

      expect(result).toEqual({
        read: true,
        write: true,
        execute: false,
      });
    });

    it('should handle zero flags', () => {
      const result = service.extractPermissions(0);

      expect(result).toEqual({
        read: false,
        write: false,
        execute: false,
      });
    });
  });

  describe('computeFlags', () => {
    it('should compute flags correctly from permissions', () => {
      const result = service.computeFlags({
        read: true,
        write: true,
        execute: true,
      });

      expect(result).toBe(TaskPermissionFlags.RWX);
    });

    it('should compute partial flags', () => {
      const result = service.computeFlags({
        read: true,
        write: true,
        execute: false,
      });

      expect(result).toBe(6); // READ | WRITE
    });

    it('should compute zero flags when all false', () => {
      const result = service.computeFlags({
        read: false,
        write: false,
        execute: false,
      });

      expect(result).toBe(0);
    });
  });
});
