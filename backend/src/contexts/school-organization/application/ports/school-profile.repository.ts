/**
 * The student and teacher profiles of a user and a teacher's assignments
 * (port; Prisma in infrastructure), for an account deletion.
 */
export abstract class SchoolProfileRepository {
  /** Locks the teacher row until the unit of work ends. */
  abstract lockTeacher(userId: number): Promise<void>;
  /** Classes headed, classes taught and lesson slots of the teacher. */
  abstract countTeacherAssignments(userId: number): Promise<number>;
  abstract clearSupervisor(userId: number): Promise<void>;
  abstract deleteProfiles(userId: number): Promise<void>;
}
