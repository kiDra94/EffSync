import { Injectable } from "@nestjs/common";
import { PasswordResetMailer } from "../../identity-access/application";
import { frontendUrl } from "../../../shared/application/frontend-url";
import { EmailService } from "./email.service";

/**
 * identity-access's PasswordResetMailer (M13), in notifications since M23.
 * The token travels in the URL fragment (decision Q9), which never reaches a
 * server log.
 */
@Injectable()
export class PasswordResetMail extends PasswordResetMailer {
  constructor(private readonly email: EmailService) {
    super();
  }

  async sendResetLink(user: { user_id: number; email: string }, token: string) {
    const sent = await this.email.sendPasswordResetEmail(
      user.user_id,
      user.email,
      `${frontendUrl()}/reset-password#token=${token}`,
    );
    // EmailService logs a failed send and returns false
    if (!sent) throw new Error("Reset-Mail wurde nicht gesendet");
  }
}
