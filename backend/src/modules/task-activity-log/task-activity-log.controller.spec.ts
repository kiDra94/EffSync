import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Test, TestingModule } from "@nestjs/testing";
import { TaskActivityLogService } from "./task-activity-log.service";
import { TaskActivityLogController } from "./task-activity-log.controller";
import { PrismaService } from "../../prisma/prisma.service";

describe("TaskActivityLogController", () => {
  let controller: TaskActivityLogController;

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
      controllers: [TaskActivityLogController],
      providers: [
        TaskActivityLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskActivityLogController>(
      TaskActivityLogController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
