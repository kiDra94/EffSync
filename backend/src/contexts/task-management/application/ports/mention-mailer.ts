/**
 * Mails a user who was @mentioned in a comment (T09). The e-mail module
 * implements it until M23 moves e-mail into the notifications context.
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
