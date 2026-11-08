/**
 * Realtime events for tasks (port). RealtimeTaskEvents implements it on the
 * shared realtime transport (M20); the event names are the frontend's.
 */
export abstract class TaskRealtime {
  abstract emitTaskUpdated(userId: number, task: unknown): void;
  abstract emitTaskLocked(userId: number, taskId: number, reason: string): void;
}
