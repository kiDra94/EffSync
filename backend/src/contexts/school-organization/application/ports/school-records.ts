/** Row shapes of the school-organization ports (Prisma types, type-only, G1). */
import type { Prisma } from "@prisma/client";

export type ScheduleRecord = Prisma.schedulesGetPayload<object>;
export type ScheduleWithClassesAndSlots = Prisma.schedulesGetPayload<{
  include: { classes: true; lesson_slots: true };
}>;
export type ScheduleDetails = Prisma.schedulesGetPayload<{
  include: {
    classes: { include: { students: { include: { users: true } } } };
    lesson_slots: true;
  };
}>;
export type LessonSlotRecord = Prisma.lesson_slotsGetPayload<object>;
