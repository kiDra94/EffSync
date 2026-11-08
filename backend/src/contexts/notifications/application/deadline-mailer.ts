/** A user a deadline mail goes to. */
export interface MailRecipient {
  user_id: number;
  email: string | null;
}

/**
 * Mails a task's assignee about its deadline (T46), if they want deadline
 * mails (email_preferences.email_on_deadline). task-management's deadline
 * jobs call it (M23).
 */
export abstract class DeadlineMailer {
  /** true if a mail was sent. */
  abstract sendDeadlineReminder(
    recipient: MailRecipient,
    taskTitle: string,
    deadline: Date,
  ): Promise<boolean>;
}
