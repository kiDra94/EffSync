/**
 * Mails a user who was @mentioned in a comment (T09). task-management's
 * comments call it; the notifications context's EmailService implements it
 * (moved here from task-management in M23, so the dependency runs from
 * task-management to notifications only).
 */
export abstract class MentionMailer {
  abstract sendMentionEmail(
    userId: number,
    email: string,
    commenterName: string,
    taskTitle: string,
    commentExcerpt: string,
  ): Promise<unknown>;
}
