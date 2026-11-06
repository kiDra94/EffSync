import { Test, TestingModule } from "@nestjs/testing";
import { TaskTemplatesService } from "./task-templates.service";
import { TaskTemplatesController } from "./task-templates.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";

describe("TaskTemplatesController", () => {
  let controller: TaskTemplatesController;

  const mockPrismaService = {
    task_templates: {
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
      controllers: [TaskTemplatesController],
      providers: [
        TaskTemplatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskTemplatesController>(TaskTemplatesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
