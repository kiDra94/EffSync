/** The tasks below a project (its subtree without the project itself). */
export interface SubtreeCount {
  total: number;
  completed: number;
}

/**
 * A project's progress in percent (T39, FA-34, decision Q2): the share of
 * completed tasks in its subtree; a project without subtasks shows its own
 * progress.
 */
export function projectProgress(
  subtree: SubtreeCount | undefined,
  ownProgress: number | null,
): number {
  if (!subtree || subtree.total === 0) return ownProgress ?? 0;
  return Math.round((subtree.completed / subtree.total) * 100);
}
