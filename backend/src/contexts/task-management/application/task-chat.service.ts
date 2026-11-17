import { Injectable } from "@nestjs/common";
import { TaskRepository } from "./ports/task.repository";
import { TaskVisibilityService } from "./task-visibility.service";

/** A task's chat as communication needs it (T29, M21). */
interface TaskChatInfo {
  title: string | null;
  /** owns the task's chat */
  creatorId: number | null;
  /** creator, assignee and members, without duplicates */
  participantIds: number[];
}

/**
 * The task side of a task chat (T29, M21): only someone who sees the task
 * (decision B3) gets its chat; its people are the chat's members.
 */
@Injectable()
export class TaskChatService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly visibility: TaskVisibilityService,
  ) {}

  /** null if the task doesn't exist or the user doesn't see it. */
  async forChat(taskId: number, userId: number): Promise<TaskChatInfo | null> {
    if (!(await this.visibility.isVisible(taskId, userId))) return null;
    const task = await this.tasks.findChatParticipants(taskId);
    if (!task) return null;
    const ids = [
      task.created_by,
      task.assigned_to,
      ...task.task_members.map((member) => member.user_id),
    ].filter((id): id is number => typeof id === "number" && id > 0);
    return {
      title: task.title,
      creatorId: task.created_by,
      participantIds: [...new Set(ids)],
    };
  }
}
