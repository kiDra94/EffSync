import { GHOST_USER_ID } from "../../identity-access/application";
import { involvedUsers } from "../domain/task";
import { TaskRepository } from "./ports/task.repository";

/**
 * The people to tell about a task (T44, T107): its creator, assignee and
 * members, without the ghost user. The one rule for realtime events and
 * notifications.
 */
export async function involvedUsersOf(
  tasks: TaskRepository,
  task: {
    task_id: number;
    created_by: number;
    assigned_to: number | null;
  },
): Promise<number[]> {
  return involvedUsers(task, await tasks.findMemberIds(task.task_id)).filter(
    (id) => id !== GHOST_USER_ID,
  );
}
