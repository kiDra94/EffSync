import { Injectable } from "@nestjs/common";
import { LessonSlotRepository } from "./ports/lesson-slot.repository";
import type { LessonSlotInput, NewLessonSlot } from "./school-inputs";

@Injectable()
export class LessonSlotService {
  constructor(private readonly slots: LessonSlotRepository) {}

  create(slot: NewLessonSlot) {
    return this.slots.create(slot);
  }

  findAll() {
    return this.slots.findAll();
  }

  findOne(id: number) {
    return this.slots.findById(id);
  }

  update(id: number, slot: LessonSlotInput) {
    return this.slots.update(id, slot);
  }

  remove(id: number) {
    return this.slots.delete(id);
  }
}
