import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { LessonSlotRepository } from "../../application/ports/lesson-slot.repository";
import type {
  LessonSlotInput,
  NewLessonSlot,
} from "../../application/school-inputs";

/** Lesson slots on Prisma: the queries LessonSlotService made before M22. */
@Injectable()
export class PrismaLessonSlotRepository extends LessonSlotRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  create(slot: NewLessonSlot) {
    return this.db.lesson_slots.create({ data: slot });
  }

  findAll() {
    return this.db.lesson_slots.findMany();
  }

  findById(slotId: number) {
    return this.db.lesson_slots.findUnique({ where: { slot_id: slotId } });
  }

  update(slotId: number, slot: LessonSlotInput) {
    return this.db.lesson_slots.update({
      where: { slot_id: slotId },
      data: slot,
    });
  }

  delete(slotId: number) {
    return this.db.lesson_slots.delete({ where: { slot_id: slotId } });
  }
}
