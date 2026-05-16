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
  };


  beforeEach(async () => {
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
});
