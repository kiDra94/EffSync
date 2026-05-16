import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { TaskActivityLogService } from '../task-activity-log/task-activity-log.service';
import { PermissionsService } from '../permissions/permissions.service';

describe('TasksService', () => {
  let service: TasksService;

  const mockPrismaService = {
    tasks: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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


  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebsocketGateway, useValue: {} },
        { provide: TaskActivityLogService, useValue: { create: jest.fn() } },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn(), hasAnyPermission: jest.fn() } },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('recalculates and returns COMPLETED task in findOne', async () => {
    mockPrismaService.tasks.findUnique
      .mockResolvedValueOnce({
        task_id: 10,
        title: 'Task A',
        status: 'IN_PROGRESS',
        progress: 40,
        created_by: 21,
        assigned_to: 22,
      })
      .mockResolvedValueOnce({
        task_id: 10,
        title: 'Task A',
        status: 'COMPLETED',
        progress: 100,
        created_by: 21,
        assigned_to: 22,
      });

    mockPrismaService.task_members.findMany.mockResolvedValue([]);
    mockPrismaService.users.findMany.mockResolvedValue([
      {
        user_id: 21,
        students: { student_id: 21 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
      {
        user_id: 22,
        students: { student_id: 22 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 21 },
      { added_by: 22 },
    ]);
    mockPrismaService.tasks.update.mockResolvedValue({ task_id: 10, status: 'COMPLETED' });

    const result = await service.findOne(10, false);

    expect(mockPrismaService.tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: 10 },
        data: expect.objectContaining({
          status: 'COMPLETED',
          progress: 100,
        }),
      }),
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('recalculates task statuses in findAll response', async () => {
    mockPrismaService.user_roles.findMany.mockResolvedValue([
      { roles: { name: 'Teacher' } },
    ]);

    mockPrismaService.tasks.findMany.mockResolvedValue([
      {
        task_id: 11,
        title: 'Task B',
        status: 'IN_PROGRESS',
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
        user_roles: [{ roles: { name: 'Student' } }],
      },
      {
        user_id: 32,
        students: { student_id: 32 },
        user_roles: [{ roles: { name: 'Student' } }],
      },
    ]);
    mockPrismaService.documents.findMany.mockResolvedValue([
      { added_by: 31 },
      { added_by: 32 },
    ]);
    mockPrismaService.tasks.update.mockResolvedValue({ task_id: 11, status: 'COMPLETED' });

    const result = await service.findAll({}, 123);

    expect(result.data[0].status).toBe('COMPLETED');
    expect(result.data[0].progress).toBe(100);
  });
});
