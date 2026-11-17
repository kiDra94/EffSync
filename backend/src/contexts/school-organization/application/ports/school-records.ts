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
export type ClassRecord = Prisma.classesGetPayload<object>;
export type DepartmentRecord = Prisma.departmentsGetPayload<object>;
export type SubjectRecord = Prisma.subjectsGetPayload<object>;
export type RoomRecord = Prisma.roomsGetPayload<object>;

/** A student or teacher as the school views show them: the name, no e-mail. */
export interface Person {
  user_id: number;
  firstname: string;
  lastname: string;
  username: string;
}

/** A class in the list (M36). */
export interface ClassSummary {
  class_id: number;
  name: string | null;
  department_id: number | null;
  head_teacher_id: number | null;
  schedule_id: number | null;
  department: { department_id: number; name: string | null } | null;
  head_teacher: Person | null;
  student_count: number;
  teacher_count: number;
}

/** A class with its members (decision D2). */
export interface ClassDetails extends Omit<
  ClassSummary,
  "student_count" | "teacher_count"
> {
  schedule: {
    schedule_id: number;
    name: string | null;
    valid_from: Date | null;
    valid_to: Date | null;
  } | null;
  students: Person[];
  teachers: Person[];
}

/** Who can be assigned to a class: the users with a student or teacher profile. */
export interface AssignablePeople {
  students: (Person & { class_id: number | null })[];
  teachers: Person[];
}

export type DepartmentWithCount = DepartmentRecord & { class_count: number };
