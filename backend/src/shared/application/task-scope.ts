/**
 * Which tasks a query reads (decision B3): all of them (staff), none (no
 * user; not the ghost user 0 of M14, who owns tasks), or the visible set of
 * one user: the tasks they created, are assigned to or are a
 * member of, plus all of their subtasks (M17). Shared by the task list and
 * the dashboard metrics, which count the same tasks (review M24, M37).
 */
export type TaskScope = { all: true } | { viewerId: number } | { none: true };
