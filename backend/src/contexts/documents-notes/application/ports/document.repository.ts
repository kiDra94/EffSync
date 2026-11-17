import type {
  DocumentRecord,
  DocumentScope,
  DocumentWithRelations,
  GradedDocument,
  NewDocument,
  RoleNames,
  StudentProfile,
  TaskDocument,
  TaskForLinking,
  TaskRecord,
} from "./document-records";

/**
 * Documents (port; Prisma in infrastructure). Each method is one of the
 * queries DocumentsService made before M19 (decision G1); writes join the
 * use case's unit of work.
 */
export abstract class DocumentRepository {
  abstract findWithRelations(
    documentId: number,
  ): Promise<DocumentWithRelations | null>;
  abstract findUploader(
    documentId: number,
  ): Promise<{ added_by: number | null } | null>;
  /** Whether the document is the user's, shared with them, or (not for a student) linked to their task or note. */
  abstract countAccessible(
    documentId: number,
    userId: number,
    studentContext: boolean,
  ): Promise<number>;
  abstract findAll(
    scope: DocumentScope,
    userId: number,
  ): Promise<DocumentWithRelations[]>;
  abstract findGradesOf(studentId: number): Promise<GradedDocument[]>;
  abstract findForTask(taskId: number): Promise<TaskDocument[]>;
  abstract findLinkedTask(
    documentId: number,
  ): Promise<{ tasks: TaskRecord } | null>;

  // the requester (identity data read the same way as before M19)
  abstract findRoleNames(userId: number): Promise<RoleNames | null>;
  abstract findStudentProfile(userId: number): Promise<StudentProfile | null>;
  abstract findUserIdsWithRoles(roleNames: string[]): Promise<number[]>;
  // the task a document is linked to (task data read the same way)
  abstract findTaskForLinking(
    taskId: number,
    userId: number,
  ): Promise<TaskForLinking | null>;
  abstract findTask(taskId: number): Promise<TaskRecord | null>;

  abstract create(data: NewDocument): Promise<DocumentRecord>;
  abstract linkToTask(documentId: number, taskId: number): Promise<void>;
  abstract rename(documentId: number, name: string): Promise<DocumentRecord>;
  abstract recordGrade(
    documentId: number,
    grade: string | null,
    feedback: string | null,
    graderId: number,
  ): Promise<DocumentRecord>;
  /** Deletes the document with its shares and its note and task links. */
  abstract delete(documentId: number): Promise<void>;
}
