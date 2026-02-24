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

  describe("create", () => {
    it("sollte Template mit Relations erstellen", async () => {
      const createDto = {
        name: "Neues Template",
        description: "Test Beschreibung",
        default_priority: "HIGH" as any,
        default_status: "TODO" as any,
        estimated_duration: 60,
      };

      mockPrismaService.task_templates.create.mockResolvedValue({
        ...mockTemplate,
        ...createDto,
        user: mockUser,
      });

      const result = await service.create(createDto, 1, true);

      expect(prisma.task_templates.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          created_by: 1,
        },
        include: expect.objectContaining({
          user: expect.any(Object),
        }),
      });
      expect(result).toHaveProperty("name", "Neues Template");
    });

    it("sollte Template ohne Relations erstellen", async () => {
      const createDto = {
        name: "Minimal Template",
        description: "Nur Daten",
        default_priority: "LOW" as any,
        default_status: "TODO" as any,
      };

      mockPrismaService.task_templates.create.mockResolvedValue({
        ...mockTemplate,
        ...createDto,
      });

      const result = await service.create(createDto, 1, false);

      expect(prisma.task_templates.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          created_by: 1,
        },
        include: undefined,
      });
    });
  });

  describe("findAll", () => {
    it("sollte alle Templates eines Users zurückgeben", async () => {
      mockPrismaService.task_templates.findMany.mockResolvedValue([
        mockTemplate,
      ]);

      const result = await service.findAll(1, true);

      expect(prisma.task_templates.findMany).toHaveBeenCalledWith({
        where: { created_by: 1 },
        include: expect.any(Object),
        orderBy: { created_at: "desc" },
      });
      expect(result).toHaveLength(1);
    });

    it("sollte alle Templates zurückgeben wenn kein createdBy angegeben", async () => {
      mockPrismaService.task_templates.findMany.mockResolvedValue([
        mockTemplate,
      ]);

      const result = await service.findAll(undefined, false);

      expect(prisma.task_templates.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: undefined,
        orderBy: { created_at: "desc" },
      });
    });
  });

  describe("findOne", () => {
    it("sollte Template zurückgeben wenn es existiert", async () => {
      mockPrismaService.task_templates.findUnique.mockResolvedValue({
        ...mockTemplate,
        user: mockUser,
      });

      const result = await service.findOne(1, true);

      expect(prisma.task_templates.findUnique).toHaveBeenCalledWith({
        where: { template_id: 1 },
        include: expect.any(Object),
      });
      expect(result).toHaveProperty("template_id", 1);
    });

    it("sollte NotFoundException werfen wenn Template nicht existiert", async () => {
      mockPrismaService.task_templates.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        "Task-Template with ID 999 not found!",
      );
    });
  });
});