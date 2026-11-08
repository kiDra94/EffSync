import type {
  ScheduleDetails,
  ScheduleRecord,
  ScheduleWithClassesAndSlots,
} from "./school-records";

/** The data of a schedule as stored. */
export interface ScheduleData {
  name: string | null;
  valid_from: Date | null;
  valid_to: Date | null;
}

/** Schedules (port); the queries SchedulesService made before M22 (G1). */
export abstract class ScheduleRepository {
  /** Created, with its classes and lesson slots. */
  abstract create(data: ScheduleData): Promise<ScheduleWithClassesAndSlots>;
  /** All, newest first, with their classes and lesson slots. */
  abstract findAll(): Promise<ScheduleWithClassesAndSlots[]>;
  /** With its classes (their students and users) and lesson slots. */
  abstract findDetailed(scheduleId: number): Promise<ScheduleDetails | null>;
  abstract findById(scheduleId: number): Promise<ScheduleRecord | null>;
  /** Updated, with its classes and lesson slots. */
  abstract update(
    scheduleId: number,
    data: ScheduleData,
  ): Promise<ScheduleWithClassesAndSlots>;
  /** The deleted schedule; null while classes still refer to it (M36). */
  abstract delete(scheduleId: number): Promise<ScheduleRecord | null>;
  abstract countLessonSlots(scheduleId: number): Promise<number>;
}
