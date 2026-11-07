import { Injectable } from "@nestjs/common";
import { PasswordResetMailer } from "../../contexts/identity-access/application";
import { EmailService } from "./email.service";
import { frontendUrl } from "../../shared/presentation/frontend-url";

/**
 * identity-access's PasswordResetMailer on the existing EmailService (M13),
 * until M23 moves e-mail into the notifications context. The token travels in
 * the URL fragment (decision Q9), which never reaches a server log.
 */
@Injectable()
export class EmailPasswordResetMailer extends PasswordResetMailer {
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
