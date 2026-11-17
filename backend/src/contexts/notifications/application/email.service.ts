import { Injectable, Logger } from "@nestjs/common";
import { daysUntil } from "../domain/days-until";
import {
  generateDeadlineEmailHtml,
  generateMentionEmailHtml,
  generatePasswordResetEmailHtml,
} from "./mail-templates";
import { MentionMailer } from "./mention-mailer";
import { EmailLogRepository } from "./ports/email.repository";
import { MailTransport } from "./ports/mail-transport";

const PASSWORD_RESET_COOLDOWN_MS = 5 * 60 * 1000;

const reason = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Sends the app's e-mails and logs each in email_logs (M23, from
 * modules/email). A failed send is logged and answered with false.
 */
@Injectable()
export class EmailService extends MentionMailer {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly logs: EmailLogRepository,
    private readonly transport: MailTransport,
  ) {
    super();
  }

  /** The mail for a task that is due or overdue (T46). */
  async sendDeadlineEmail(
    userId: number,
    userEmail: string,
    taskTitle: string,
    deadline: Date,
  ): Promise<boolean> {
    const days = daysUntil(deadline);
    const subject =
      days <= 0
        ? `🚨 Aufgabe überfällig: ${taskTitle}`
        : `⏰ Aufgabe fällig in ${days} Tag(en): ${taskTitle}`;
    return this.sendAndLog(
      userId,
      userEmail,
      subject,
      generateDeadlineEmailHtml(taskTitle, deadline, days),
      "deadline",
      `Deadline: ${taskTitle}`,
    );
  }

  /** The mail for an @mention in a comment (T09). */
  async sendMentionEmail(
    mentionedUserId: number,
    mentionedUserEmail: string,
    mentionerName: string,
    taskTitle: string,
    commentExcerpt: string,
  ): Promise<boolean> {
    return this.sendAndLog(
      mentionedUserId,
      mentionedUserEmail,
      `📢 Du wurdest erwähnt: ${taskTitle}`,
      generateMentionEmailHtml(mentionerName, taskTitle, commentExcerpt),
      "mention",
      `Mention: ${taskTitle}`,
    );
  }

  /**
   * The password-reset link (T52, M13). Valid 30 minutes and only until the
   * password has changed. At most one per account every 5 minutes, so the
   * public forgot-password endpoint can't flood an inbox.
   */
  async sendPasswordResetEmail(
    userId: number,
    userEmail: string,
    link: string,
  ): Promise<boolean> {
    const subject = "EffSync: Passwort zurücksetzen";
    const since = new Date(Date.now() - PASSWORD_RESET_COOLDOWN_MS);
    if (await this.logs.sentSince(userId, "password_reset", since)) return true;
    return this.sendAndLog(
      userId,
      userEmail,
      subject,
      generatePasswordResetEmailHtml(link),
      "password_reset",
      subject,
    );
  }

  private async sendAndLog(
    userId: number,
    to: string,
    subject: string,
    html: string,
    emailType: string,
    failedSubject: string,
  ): Promise<boolean> {
    try {
      const messageId = await this.transport.send({ to, subject, html });
      this.logger.log(`Email sent successfully: ${messageId} to ${to}`);
      await this.log({
        user_id: userId,
        recipient: to,
        subject,
        email_type: emailType,
        status: "sent",
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send ${emailType} email to user ${userId}:`,
        error,
      );
      await this.log({
        user_id: userId,
        recipient: to,
        subject: failedSubject,
        email_type: emailType,
        status: "failed",
        error_message: reason(error),
      });
      return false;
    }
  }

  // a failing log never fails the send
  private async log(entry: Parameters<EmailLogRepository["log"]>[0]) {
    try {
      await this.logs.log(entry);
    } catch (error) {
      this.logger.error("Failed to log email:", error);
    }
  }
}
