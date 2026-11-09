import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TwoFactorChallenges } from "../../application/ports/two-factor-challenges";
import { jwtSecret } from "../jwt.config";

const PURPOSE = "2fa";
// UC-01b: long enough to open the app and type the code
const TTL = "5m";

interface ChallengeClaims {
  sub?: unknown;
  purpose?: unknown;
}

/**
 * The 2FA challenge as a JWT (M32): purpose "2fa", 5 minutes, signed with
 * JWT_SECRET plus ":2fa", so JwtStrategy, which verifies with JWT_SECRET
 * alone, never accepts it as an access token (as the reset tokens, Q8a).
 */
@Injectable()
export class JwtTwoFactorChallenges extends TwoFactorChallenges {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  sign(userId: number): string {
    return this.jwt.sign(
      { sub: userId, purpose: PURPOSE },
      { secret: this.key(), expiresIn: TTL },
    );
  }

  verify(token: string): number | null {
    try {
      const claims = this.jwt.verify<ChallengeClaims>(token, {
        secret: this.key(),
      });
      return claims.purpose === PURPOSE && typeof claims.sub === "number"
        ? claims.sub
        : null;
    } catch {
      return null;
    }
  }

  private key() {
    return `${jwtSecret(this.config)}:${PURPOSE}`;
  }
}
