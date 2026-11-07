import { Test, TestingModule } from "@nestjs/testing";
import { TaskActivityLogService } from "./task-activity-log.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

describe("TaskActivityLogService", () => {
  let service: TaskActivityLogService;

  const mockPrismaService = {
    task_activity_log: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
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
        TaskActivityLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TaskActivityLogService>(TaskActivityLogService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
