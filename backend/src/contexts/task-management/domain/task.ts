/**
 * The Task aggregate's rules (L1, `11_…:29-31`): hierarchy, locking and
 * status. Pure functions over the task's data, so the use cases in
 * application/ apply the same rules everywhere.
 */

/** The fields the rules read. */
interface TaskState {
  task_id: number;
  parent_task_id?: number | null;
  created_by?: number | null;
  is_locked?: boolean | null;
}

/** A task's link to its parent, for walking up the hierarchy. */
interface ParentLink {
  task_id: number;
  parent_task_id: number | null;
}

/** T100: a task is COMPLETED only at 100 % progress. */
export function isCompletionWithoutFullProgress(
  status: string | null | undefined,
  progress: number | null | undefined,
): boolean {
  return status === "COMPLETED" && (progress ?? 0) < 100;
}

/**
 * Everyone involved in a task (T44, T107): its creator, its assignee and its
 * members, each once.
 */
export function involvedUsers(
  task: { created_by?: number | null; assigned_to?: number | null },
  memberIds: (number | null)[],
): number[] {
  const ids = [task.created_by, task.assigned_to, ...memberIds].filter(
    (id): id is number => id !== null && id !== undefined,
  );
  return [...new Set(ids)];
}

/**
 * Tag names (T59, decision Q8e): trimmed, single spaces, lowercase, unique,
 * so "Mathe" and "mathe " are one tag.
 */
export function normalizeTags(names: string[]): string[] {
  const normalized = names
    .map((name) => name.trim().replace(/\s+/g, " ").toLowerCase())
    .filter((name) => name.length > 0);
  return [...new Set(normalized)];
}

/** How long a lock holds (overdue and manual locks). */
export const LOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function isOwnParent(taskId: number, parentTaskId: number): boolean {
  return taskId === parentTaskId;
}

/**
 * Whether making `parentTaskId` the parent of `taskId` would create a cycle:
 * walks up from the new parent through `parentOf` until the root.
 */
export async function wouldCreateCycle(
  taskId: number,
  parentTaskId: number,
  parentOf: (taskId: number) => Promise<ParentLink | null>,
): Promise<boolean> {
  let current = await parentOf(parentTaskId);
  const visited = new Set<number>([taskId]);

  while (current) {
    if (visited.has(current.task_id)) return true;
    visited.add(current.task_id);
    if (!current.parent_task_id) break;
    current = await parentOf(current.parent_task_id);
  }
  return false;
}

/** The id of the top-level task (the project, decision Q2) above `taskId`. */
export async function findRootId(
  taskId: number,
  parentOf: (taskId: number) => Promise<ParentLink | null>,
): Promise<number> {
  let current = await parentOf(taskId);
  const visited = new Set<number>();
  while (current?.parent_task_id && !visited.has(current.task_id)) {
    visited.add(current.task_id);
    const parent = await parentOf(current.parent_task_id);
    if (!parent) break;
    current = parent;
  }
  return current?.task_id ?? taskId;
}

/** A locked task can only be changed by its creator. */
export function mayChangeLockedTask(
  task: TaskState,
  userId: number | undefined,
): boolean {
  return !(task.is_locked && userId && task.created_by !== userId);
}

/** The creator may edit their task while it isn't locked. */
export function mayEdit(task: TaskState, userId: number): boolean {
  if (task.is_locked) return false;
  return task.created_by === userId;
}

/** Only the creator locks or unlocks a task by hand. */
export function mayLock(task: TaskState, userId: number): boolean {
  return task.created_by === userId;
}

type TaskTreeNode<T> = T & { subtasks: TaskTreeNode<T>[] };

/** The task with its subtasks nested below it, from a flat list. */
export function buildTree<T extends TaskState>(
  allTasks: T[],
  taskId: number,
): TaskTreeNode<T> | undefined {
  const taskMap = new Map<number, TaskTreeNode<T>>();

  allTasks.forEach((task) => {
    taskMap.set(task.task_id, { ...task, subtasks: [] });
  });
  taskMap.forEach((task) => {
    const current = taskMap.get(task.task_id);
    const parent =
      task.parent_task_id != null
        ? taskMap.get(task.parent_task_id)
        : undefined;
    if (current) parent?.subtasks.push(current);
  });

  return taskMap.get(taskId);
}
