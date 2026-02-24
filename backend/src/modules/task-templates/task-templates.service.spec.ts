import { Test, TestingModule } from "@nestjs/testing";
import { TaskTemplatesService } from "./task-templates.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("TaskTemplatesService", () => {
  let service: TaskTemplatesService;
  let prisma: PrismaService;

  const mockTemplate = {
    template_id: 1,
    name: "Hausaufgaben Template",
    description: "Standard Hausaufgaben Vorlage",
    default_priority: "MEDIUM",
    default_status: "TODO",
    estimated_duration: 120,
    created_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUser = {
    user_id: 1,
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
  };

  const mockPrismaService = {
    task_templates: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tasks: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTemplatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();
    service = module.get<TaskTemplatesService>(TaskTemplatesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});