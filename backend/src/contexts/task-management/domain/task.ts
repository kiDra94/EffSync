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
