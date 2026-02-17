import { Test, TestingModule } from "@nestjs/testing";
import { LessonSlotService } from "./lesson-slots.service";

describe("LessonSlotsService", () => {
  let service: LessonSlotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LessonSlotService],
    }).compile();

    service = module.get<LessonSlotService>(LessonSlotService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
