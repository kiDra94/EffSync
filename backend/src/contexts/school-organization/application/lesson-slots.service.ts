import { Injectable, NotFoundException } from "@nestjs/common";
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

  // M36 (open item of M22): a missing slot is a 404, not a 500 or an empty 200
  async findOne(id: number) {
    const slot = await this.slots.findById(id);
    if (!slot)
      throw new NotFoundException(`Unterrichtsstunde ${id} nicht gefunden`);
    return slot;
  }

  async update(id: number, slot: LessonSlotInput) {
    await this.findOne(id);
    return this.slots.update(id, slot);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.slots.delete(id);
  }
}
