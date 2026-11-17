import type { TaskScope } from "../../../../shared/application/task-scope";
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
   * One page of GET /tasks. `scope` limits it to a student's visible set
   * (decision B3); the filters, the sorting and the count apply within it,
   * inside the database (M37).
   */
  abstract findPage(
    filter: TaskListFilter,
    scope: TaskScope,
    page: TaskPageRequest,
  ): Promise<{ tasks: TaskRow[]; total: number }>;
  /** Whether the task is in the user's visible set: one upward query, false for a missing task. */
  abstract isVisibleTo(taskId: number, userId: number): Promise<boolean>;
  /**
   * Open, unlocked tasks with an assignee and a deadline in the range, with
   * the assignee's ID and e-mail (the daily reminder, T46, M23).
   */
  abstract findDueBetween(from: Date, to: Date): Promise<DeadlineTask[]>;
  /** Open, unlocked tasks with an assignee whose deadline has passed (feature #27). */
  abstract findOverdueUnlocked(now: Date): Promise<DeadlineTask[]>;
  /** The title and the people of a task (creator, assignee, members), for its chat (M21). */
  abstract findChatParticipants(taskId: number): Promise<{
    title: string | null;
    created_by: number;
    assigned_to: number | null;
    task_members: { user_id: number }[];
  } | null>;
  abstract findSubtasks(
    parentId: number,
    includeRelations: boolean,
  ): Promise<TaskRow[]>;
  abstract findChildIds(parentId: number): Promise<number[]>;
  abstract countSubtasks(taskId: number): Promise<number>;
  abstract findAllByCreator(
    createdBy: number,
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

/** A task the deadline jobs work on, with its assignee (M23). */
export interface DeadlineTask {
  task_id: number;
  title: string | null;
  deadline: Date | null;
  assignee: { user_id: number; email: string | null };
}
