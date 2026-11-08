import { Injectable } from "@nestjs/common";
import { DeadlineMailer, type MailRecipient } from "./deadline-mailer";
import { EmailService } from "./email.service";
import { EmailPreferenceRepository } from "./ports/email.repository";

/** The deadline mail, only for users who want it (T46; default: yes). */
@Injectable()
export class DeadlineMailService extends DeadlineMailer {
  constructor(
    private readonly email: EmailService,
    private readonly preferences: EmailPreferenceRepository,
  ) {
    super();
  }

  async sendDeadlineReminder(
    recipient: MailRecipient,
    taskTitle: string,
    deadline: Date,
  ): Promise<boolean> {
    if (!recipient.email) return false;
    const preferences = await this.preferences.find(recipient.user_id);
    if (preferences?.email_on_deadline === false) return false;
    return this.email.sendDeadlineEmail(
      recipient.user_id,
      recipient.email,
      taskTitle,
      deadline,
    );
  }
}
