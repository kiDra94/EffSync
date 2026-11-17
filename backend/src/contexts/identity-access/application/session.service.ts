import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { AuthService } from "./auth.service";
import { RefreshTokenRepository } from "./ports/refresh-token.repository";

/** Refresh tokens live 7 days (T51, NFA-06); access tokens 15 minutes (jwt.config.ts). */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/**
 * Login sessions (T51, T123, decision Q8b). The refresh token is a random
 * value; only its SHA-256 hash is stored. Each refresh rotates it, and logout
 * revokes only the current session.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly auth: AuthService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  /** Opens a session for the user and returns its refresh token. */
  start(userId: number): Promise<string> {
    return this.issue(userId, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
  }

  /** Swaps a refresh token for a new access token and a new refresh token. */
  async refresh(refreshToken: string) {
    return this.unitOfWork.run(async () => {
      const session = await this.refreshTokens.findActiveByHash(
        hash(refreshToken),
      );
      // the conditional revoke also stops a parallel refresh with the same token
      if (!session || !(await this.refreshTokens.revokeIfActive(session.id))) {
        throw new UnauthorizedException("Ungültiges Refresh-Token");
      }
      const { token } = this.auth.issueToken(session.users);
      // the new row keeps the login's expiry: a session ends 7 days after login
      const rotated = await this.issue(session.user_id, session.expires_at);
      return { token, refreshToken: rotated };
    });
  }

  /** Revokes the session; an unknown or already revoked token is ignored. */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokens.revokeActiveByHash(hash(refreshToken));
  }

  /** Deletes expired sessions (revoked or not); returns how many. */
  deleteExpired(): Promise<number> {
    return this.refreshTokens.deleteExpired();
  }

  private async issue(userId: number, expiresAt: Date): Promise<string> {
    const refreshToken = randomBytes(32).toString("base64url");
    await this.refreshTokens.create({
      user_id: userId,
      token_hash: hash(refreshToken),
      expires_at: expiresAt,
    });
    return refreshToken;
  }
}
