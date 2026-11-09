import { Injectable, Logger } from "@nestjs/common";
import { GHOST_USER_ID } from "../../identity-access/application";
import { Notifier } from "../../notifications/application";
import { involvedUsersOf } from "./involved-users";
import { TaskRepository } from "./ports/task.repository";

interface NotifiedTask {
  task_id: number;
  title: string | null;
  status: string | null;
  created_by: number;
  assigned_to: number | null;
}

/**
 * Notifications about a task (T44, T72, M16), through the notifications
 * context's port. Sent after the use case committed; a failed notification
 * is logged and doesn't undo the change. The actor and the ghost user get
 * none.
 */
@Injectable()
export class TaskNotificationsService {
  private readonly logger = new Logger(TaskNotificationsService.name);

  constructor(
    private readonly notifier: Notifier,
    private readonly tasks: TaskRepository,
  ) {}

  taskAssigned(task: NotifiedTask, actorId: number) {
    return this.send([task.assigned_to], actorId, {
      type: "task_assigned",
      text: `Dir wurde die Aufgabe "${task.title}" zugewiesen.`,
    });
  }

  async statusChanged(task: NotifiedTask, actorId: number | undefined) {
    return this.send(await involvedUsersOf(this.tasks, task), actorId, {
      type: "task_status_changed",
      text: `Status von "${task.title}": ${task.status}`,
    });
  }

  memberAdded(task: NotifiedTask, userId: number, actorId: number) {
    return this.send([userId], actorId, {
      type: "task_member_added",
      text: `Du wurdest zur Aufgabe "${task.title}" hinzugefügt.`,
    });
  }

  memberRemoved(task: NotifiedTask, userId: number, actorId: number) {
    return this.send([userId], actorId, {
      type: "task_member_removed",
      text: `Du wurdest aus der Aufgabe "${task.title}" entfernt.`,
    });
  }

  private async send(
    userIds: (number | null)[],
    actorId: number | undefined,
    message: { type: string; text: string },
  ) {
    const recipients = userIds.filter(
      (userId): userId is number =>
        userId !== null && userId !== actorId && userId !== GHOST_USER_ID,
    );
    // all at once; one failure doesn't stop the others
    const results = await Promise.allSettled(
      recipients.map((userId) => this.notifier.notify({ userId, ...message })),
    );
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        this.logger.error(
          `Notification ${message.type} an ${recipients[i]} fehlgeschlagen`,
          result.reason,
        );
      }
    });
  }
}
