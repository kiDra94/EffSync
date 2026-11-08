import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaLessonSlotRepository } from "../infrastructure/persistence/prisma-lesson-slot.repository";
import { LessonSlotService } from "./lesson-slots.service";

describe("LessonSlotService", () => {
  const lessonSlots = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const service = new LessonSlotService(
    new PrismaLessonSlotRepository(
      new PrismaUnitOfWork({
        lesson_slots: lessonSlots,
      } as unknown as PrismaService),
    ),
  );

  it("reads, changes and deletes a slot by its slot_id", async () => {
    await service.findOne(4);
    await service.update(4, { room_id: 2 });
    await service.remove(4);

    const where = { where: { slot_id: 4 } };
    expect(lessonSlots.findUnique).toHaveBeenCalledWith(where);
    expect(lessonSlots.update).toHaveBeenCalledWith({
      ...where,
      data: { room_id: 2 },
    });
    expect(lessonSlots.delete).toHaveBeenCalledWith(where);
  });
});
