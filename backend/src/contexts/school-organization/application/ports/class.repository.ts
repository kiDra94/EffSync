import type { ClassInput } from "../school-inputs";
import type {
  AssignablePeople,
  ClassDetails,
  ClassRecord,
  ClassSummary,
} from "./school-records";

/** Classes and their members (port; Prisma in infrastructure). */
export abstract class ClassRepository {
  abstract findAll(): Promise<ClassSummary[]>;
  abstract findDetails(classId: number): Promise<ClassDetails | null>;
  abstract create(data: ClassInput & { name: string }): Promise<ClassRecord>;
  abstract update(classId: number, data: ClassInput): Promise<ClassRecord>;
  /**
   * Deletes the class with its student and teacher assignments in one
   * transaction of its own; false if other rows still refer to it (e.g. a
   * class chat).
   */
  abstract delete(classId: number): Promise<boolean>;

  /** Heads the class or teaches it (classes_teachers). */
  abstract isTeacherOf(classId: number, userId: number): Promise<boolean>;
  abstract exists(classId: number): Promise<boolean>;
  /** Of the given user IDs, those with a student profile, with their class. */
  abstract findStudents(
    userIds: number[],
  ): Promise<{ student_id: number; class_id: number | null }[]>;
  /** Of the given user IDs, those with a teacher profile. */
  abstract findTeacherIds(userIds: number[]): Promise<number[]>;
  /** The class's students are exactly these (others leave it). */
  abstract replaceStudents(
    classId: number,
    studentIds: number[],
  ): Promise<void>;
  /** The class's teachers are exactly these. */
  abstract replaceTeachers(
    classId: number,
    teacherIds: number[],
  ): Promise<void>;
  abstract findAssignable(): Promise<AssignablePeople>;
}
