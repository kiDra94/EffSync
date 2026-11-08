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
  abstract findCompletionSnapshots(
    taskIds: number[],
  ): Promise<TaskCompletionSnapshot[]>;
  abstract priorityExists(priorityId: number): Promise<boolean>;

  /**
   * One page of GET /tasks. `visibleIds` limits it to a student's visible set
   * (decision B3); the filters, the sorting and the count apply within it.
   */
  abstract findPage(
    filter: TaskListFilter,
    visibleIds: number[] | undefined,
    page: TaskPageRequest,
  ): Promise<{ tasks: TaskRow[]; total: number }>;
  /**
   * The tasks a user created, is assigned to or is a member of, plus all of
   * their subtasks (decision B3, M17).
   */
  abstract findVisibleTaskIds(userId: number): Promise<number[]>;
  /** Whether the task is in the user's visible set: one upward query, false for a missing task. */
  abstract isVisibleTo(taskId: number, userId: number): Promise<boolean>;
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
  /** Replaces the task's tags; unknown names become new tags (T59). */
  abstract setTags(taskId: number, names: string[]): Promise<void>;
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
  /** The explicit members of these tasks. */
  abstract findMembersOf(
    taskIds: number[],
  ): Promise<{ task_id: number; user_id: number }[]>;
  /** Graded submissions of these students for these tasks, with the tasks they belong to. */
  abstract findGradedSubmissions(
    studentIds: number[],
    taskIds: number[],
  ): Promise<{ added_by: number | null; taskIds: number[] }[]>;
  abstract completeTasks(taskIds: number[]): Promise<void>;
  abstract findSubmissionsOf(
    taskId: number,
    userId: number,
  ): Promise<StudentSubmission[]>;
  abstract findDocuments(taskId: number): Promise<DocumentRecord[]>;
}
