/** What the school-organization use cases accept (the DTOs satisfy them). */
export interface ClassInput {
  name?: string;
  department_id?: number;
  head_teacher_id?: number;
  schedule_id?: number;
}

export interface DepartmentInput {
  name?: string;
}

export interface SubjectInput {
  name?: string;
  short_name?: string;
}

export interface RoomInput {
  name?: string;
  type?: string;
  capacity?: number;
  building?: string;
}

export interface ScheduleInput {
  name?: string;
  valid_from?: string;
  valid_to?: string;
}

export interface LessonSlotInput {
  schedule_id?: number;
  subject_id?: number;
  teacher_id?: number;
  room_id?: number;
  day_of_week?: number;
  lesson_number?: number;
  start_time?: string;
  end_time?: string;
}

/** A new lesson slot: the schedule, day and lesson number are required. */
export type NewLessonSlot = LessonSlotInput & {
  schedule_id: number;
  day_of_week: number;
  lesson_number: number;
};
