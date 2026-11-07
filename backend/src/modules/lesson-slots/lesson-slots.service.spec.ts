import { Test, TestingModule } from "@nestjs/testing";
import { LessonSlotService } from "./lesson-slots.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

describe("LessonSlotService", () => {
  let service: LessonSlotService;

  const mockPrismaService = {
    lesson_slots: {
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
        LessonSlotService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LessonSlotService>(LessonSlotService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
