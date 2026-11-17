/**
 * Sends the reset link (T52). identity-access defines the port; the e-mail
 * module implements it (EmailPasswordResetMailer) until M23 moves e-mail into
 * the notifications context.
 */
export abstract class PasswordResetMailer {
  abstract sendResetLink(
    user: { user_id: number; email: string },
    token: string,
  ): Promise<void>;
}
