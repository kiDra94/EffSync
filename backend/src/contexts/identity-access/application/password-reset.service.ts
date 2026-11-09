import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { PasswordResetMailer } from "./ports/password-reset-mailer";
import { RefreshTokenRepository } from "./ports/refresh-token.repository";
import { ResetTokens } from "./ports/reset-tokens";
import { UserRepository } from "./ports/user.repository";
import { GHOST_USER_ID } from "../domain/ghost-user";

/** Password reset by e-mail (T52, decision Q8a) and the password change itself. */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly tokens: ResetTokens,
    private readonly mailer: PasswordResetMailer,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly auth: AuthService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  /**
   * Mails a reset link if an account has this address. The caller always
   * answers the same, and the mail is not awaited, so neither the answer nor
   * its timing reveals whether the address exists.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.users.findByEmailWithRoles(email);
    // the ghost user has no mailbox and must never get a password (M14)
    if (!user?.email || user.user_id === GHOST_USER_ID) return;

    const token = this.tokens.sign(user.user_id, user.password_hash ?? "");
    this.mailer
      .sendResetLink({ user_id: user.user_id, email: user.email }, token)
      .catch((error: unknown) =>
        this.logger.error(
          `Reset-Mail an Nutzer ${user.user_id} fehlgeschlagen`,
          error,
        ),
      );
  }

  /**
   * A reset token for a user who proved themselves another way: the Google
   * reset path (review M32). It only sets the password, so it opens no
   * session and skips no 2FA.
   */
  async tokenFor(userId: number): Promise<string> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.tokens.sign(user.user_id, user.password_hash ?? "");
  }

  /**
   * The user a reset token belongs to; null if the token is no reset token
   * (e.g. an access token). A used, expired or forged reset token gets 401.
   */
  async userIdForResetToken(token: string): Promise<number | null> {
    const userId = this.tokens.subjectOf(token);
    if (userId === null) return null;

    const user = await this.users.findById(userId);
    if (!user || !this.tokens.verify(token, user.password_hash ?? "")) {
      throw new UnauthorizedException("Ungültiger oder abgelaufener Link");
    }
    return userId;
  }

  /**
   * Sets the new password and ends all of the user's sessions (M12, M13), in
   * one unit of work: a failed revoke rolls the password change back.
   * Access tokens issued before stay valid until they expire (15 minutes).
   */
  async changePassword(userId: number, password: string): Promise<void> {
    await this.unitOfWork.run(async () => {
      await this.auth.setNewPassword(userId, password);
      await this.refreshTokens.revokeAllForUser(userId);
    });
  }
}
