import { Test, TestingModule } from "@nestjs/testing";
import { SchedulesService } from "./schedules.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("SchedulesService", () => {
  let service: SchedulesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    schedules: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    lesson_slots: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
