import type {
  DocumentRecord,
  NewTask,
  ParentLinkRecord,
  ParticipantProfile,
  StudentSubmission,
  TaskChanges,
  TaskCompletionSnapshot,
  TaskListFilter,
  TaskPageRequest,
  TaskRecord,
  TaskRow,
  TaskWithRelations,
} from "./task-records";

/**
 * Tasks (port; Prisma in infrastructure). Each method is one of the queries
 * TasksService made before M15 (decision G1); writes join the use case's
 * unit of work.
 */
export abstract class TaskRepository {
  abstract findById(taskId: number): Promise<TaskRecord | null>;
  abstract findRow(
    taskId: number,
    includeRelations: boolean,
  ): Promise<TaskRow | null>;
  abstract findParentLink(taskId: number): Promise<ParentLinkRecord | null>;
  abstract findCompletionSnapshot(
    taskId: number,
  ): Promise<TaskCompletionSnapshot | null>;
  abstract priorityExists(priorityId: number): Promise<boolean>;

  /** One page of GET /tasks; `visibleTo` limits it to a non-staff user's tasks. */
  abstract findPage(
    filter: TaskListFilter,
    visibleTo: number | undefined,
    page: TaskPageRequest,
  ): Promise<{ tasks: TaskRow[]; total: number }>;
  abstract findChildrenOf(
    parentIds: number[],
    includeRelations: boolean,
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): Promise<TaskRow[]>;
  abstract findSubtasks(
    parentId: number,
    includeRelations: boolean,
  ): Promise<TaskRow[]>;
  abstract findChildIds(parentId: number): Promise<number[]>;
  abstract countSubtasks(taskId: number): Promise<number>;
  abstract findAllByCreator(
    createdBy: number | null,
    includeRelations: boolean,
  ): Promise<TaskRow[]>;
  abstract findWithCompletionRule(): Promise<TaskRecord[]>;
  abstract findCompletedChildIds(parentId: number): Promise<number[]>;

  abstract create(data: NewTask): Promise<TaskWithRelations>;
  abstract addMember(taskId: number, userId: number): Promise<void>;
  abstract update(
    taskId: number,
    data: TaskChanges,
  ): Promise<TaskWithRelations>;
  /** An update that returns only the task row (status, locks). */
  abstract updateRow(taskId: number, data: TaskChanges): Promise<TaskRecord>;
  abstract completeAll(taskIds: number[]): Promise<void>;
  /**
   * Deletes the task with its comments, grading remarks and document links,
   * and detaches its chat rooms. Its activity-log rows stay (decision Q8g).
   */
  abstract delete(taskId: number): Promise<void>;

  // read-time completion from grades (T119, M17)
  abstract findMemberIds(taskId: number): Promise<number[]>;
  abstract findParticipantProfiles(
    userIds: number[],
  ): Promise<ParticipantProfile[]>;
  /** `added_by` of the graded submissions of these students for the task. */
  abstract findGradedSubmissionAuthors(
    studentIds: number[],
    taskId: number,
  ): Promise<(number | null)[]>;
  abstract findSubmissionsOf(
    taskId: number,
    userId: number,
  ): Promise<StudentSubmission[]>;
  abstract findDocuments(taskId: number): Promise<DocumentRecord[]>;
}
