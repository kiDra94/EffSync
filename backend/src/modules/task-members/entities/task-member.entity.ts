/**
 * Response Entity für Task-Members.
 * Zeigt die Mitgliedschaftsinformationen einer Task.
 */
export class TaskMemberEntity {
  task_id: number;
  user_id: number;
  joined_at: Date;
  
  // Optional: User-Details bei expanded Response
  user?: {
    user_id: number;
    firstname: string;
    lastname: string;
    email: string;
    username: string;
  };
}
