/**
 * Realtime events for tasks (port). The WebSocket gateway implements it
 * (modules/websocket) until M20 moves the transport to shared/infrastructure.
 */
export abstract class TaskRealtime {
  abstract emitTaskUpdated(userId: number, task: unknown): void;
  abstract emitTaskLocked(userId: number, taskId: number, reason: string): void;
}
