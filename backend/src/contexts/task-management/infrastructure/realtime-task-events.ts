import { Injectable, Logger } from "@nestjs/common";
import { RealtimePublisher } from "../../../shared/application/realtime";
import { TaskRealtime } from "../application/ports/task-realtime";

/** Task events to the browser through the shared realtime transport (M20). */
@Injectable()
export class RealtimeTaskEvents extends TaskRealtime {
  private readonly logger = new Logger(RealtimeTaskEvents.name);

  constructor(private readonly publisher: RealtimePublisher) {
    super();
  }

  emitTaskUpdated(userId: number, task: unknown) {
    this.publisher.toUser(userId, "task:updated", task);
  }

  /** Feature #27: a task was locked, e.g. at its deadline. */
  emitTaskLocked(userId: number, taskId: number, reason: string) {
    this.publisher.toUser(userId, "task:locked", {
      taskId,
      reason,
      timestamp: new Date(),
    });
    this.logger.log(
      `📡 Task locked event sent to user ${userId}: task ${taskId} - reason: ${reason}`,
    );
  }
}
