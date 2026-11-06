/**
 * Response entity for task members.
 * Shows the membership information of a task.
 */
export class TaskMemberEntity {
  task_id: number;
  user_id: number;
  joined_at: Date;

  // Optional: user details in an expanded response
  user?: {
    user_id: number;
    firstname: string;
    lastname: string;
    email: string;
    username: string;
  };
}
