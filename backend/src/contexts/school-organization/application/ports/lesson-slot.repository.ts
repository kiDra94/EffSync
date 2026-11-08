import type { LessonSlotInput, NewLessonSlot } from "../school-inputs";
import type { LessonSlotRecord } from "./school-records";

/** Lesson slots (port); the queries LessonSlotService made before M22. */
export abstract class LessonSlotRepository {
  abstract create(slot: NewLessonSlot): Promise<LessonSlotRecord>;
  abstract findAll(): Promise<LessonSlotRecord[]>;
  abstract findById(slotId: number): Promise<LessonSlotRecord | null>;
  abstract update(
    slotId: number,
    slot: LessonSlotInput,
  ): Promise<LessonSlotRecord>;
  abstract delete(slotId: number): Promise<LessonSlotRecord>;
}
