/**
 * Task-level member rights (T99, `07_…:29-31`, decision I4, M38): each
 * membership carries READ/WRITE/EXECUTE. READ lists the members, WRITE adds
 * and removes them, EXECUTE changes their flags. A new member gets READ:
 * the default of `task_members.flags`, which the migration also gave the
 * existing memberships.
 */
export const TaskFlags = {
  READ: 4,
  WRITE: 2,
  EXECUTE: 1,
  RWX: 7,
} as const;

/** One task's people as the rights see them: creator, assignee, member row. */
interface TaskAccess {
  createdBy: number;
  assignedTo: number | null;
  memberFlags: number | null;
}

/**
 * A user's flags on a task, combined over the task and every task above it
 * (`chain`, the task first): Admin/Superuser and a creator have every flag,
 * an assignee READ+WRITE, an explicit member their row's flags, anyone else
 * none.
 */
export function effectiveTaskFlags(access: {
  userId: number;
  chain: TaskAccess[];
  privileged: boolean;
}): number {
  if (access.privileged) return TaskFlags.RWX;
  let flags = 0;
  for (const task of access.chain) {
    if (task.createdBy === access.userId) return TaskFlags.RWX;
    flags |= task.memberFlags ?? 0;
    if (task.assignedTo === access.userId) {
      flags |= TaskFlags.READ | TaskFlags.WRITE;
    }
  }
  return flags & TaskFlags.RWX;
}
