import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { PasswordResetMailer } from "./ports/password-reset-mailer";
import { RefreshTokenRepository } from "./ports/refresh-token.repository";
import { ResetTokens } from "./ports/reset-tokens";
import { UserRepository } from "./ports/user.repository";

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
    if (!user?.email) return;

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
