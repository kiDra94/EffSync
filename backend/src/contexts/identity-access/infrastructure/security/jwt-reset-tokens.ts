import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ResetTokens } from "../../application/ports/reset-tokens";
import { jwtSecret } from "../jwt.config";

export const RESET_TOKEN_TTL = "30m";
const PURPOSE = "reset";

interface ResetClaims {
  sub?: unknown;
  purpose?: unknown;
}

/**
 * Reset tokens as JWTs (decision Q8a): purpose "reset", 30 minutes, signed
 * with JWT_SECRET plus the password hash. JwtStrategy verifies with
 * JWT_SECRET alone, so a reset token is never accepted as an access token:
 * the ":reset:" part keeps the key different even without a password hash
 * (Google-only accounts).
 */
@Injectable()
export class JwtResetTokens extends ResetTokens {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  sign(userId: number, passwordHash: string): string {
    return this.jwt.sign(
      { sub: userId, purpose: PURPOSE },
      { secret: this.keyFor(passwordHash), expiresIn: RESET_TOKEN_TTL },
    );
  }

  subjectOf(token: string): number | null {
    const claims = this.jwt.decode<ResetClaims | null>(token);
    return claims?.purpose === PURPOSE && typeof claims.sub === "number"
      ? claims.sub
      : null;
  }

  verify(token: string, passwordHash: string): boolean {
    try {
      const claims = this.jwt.verify<ResetClaims>(token, {
        secret: this.keyFor(passwordHash),
      });
      return claims.purpose === PURPOSE;
    } catch {
      return false;
    }
  }

  private keyFor(passwordHash: string): string {
    return `${jwtSecret(this.config)}:reset:${passwordHash}`;
  }
}
