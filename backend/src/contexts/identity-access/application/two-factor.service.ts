import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { GHOST_USER_ID } from "../domain/ghost-user";
import { RefreshTokenRepository } from "./ports/refresh-token.repository";
import { UserRepository } from "./ports/user.repository";
import { SecretCipher } from "./ports/secret-cipher";
import { Totp } from "./ports/totp";
import { TwoFactorChallenges } from "./ports/two-factor-challenges";
import {
  TwoFactorRecord,
  TwoFactorRepository,
} from "./ports/two-factor.repository";

/**
 * Two-factor authentication with TOTP (T31, FA-06, UC-01b, decision Q8d,
 * M32): set up in the profile with a QR code, confirmed with a first code,
 * then asked for at every password login. No recovery codes: an admin
 * resets it by deleting the row.
 */
// wrong codes in a row before the code check locks (review M32), for how long
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
// as long as a challenge is valid (JwtTwoFactorChallenges)
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class TwoFactorService {
  // In memory, so for one backend process (a restart forgets them):
  // the last time step whose code each user used, so a code counts once;
  private readonly lastStep = new Map<number, number>();
  // wrong codes per user, against guessing from many IP addresses;
  private readonly failures = new Map<
    number,
    { count: number; lockedUntil: number }
  >();
  // challenges that already opened a session, until they expire
  private readonly usedChallenges = new Map<string, number>();

  constructor(
    private readonly twoFactor: TwoFactorRepository,
    private readonly totp: Totp,
    private readonly cipher: SecretCipher,
    private readonly challenges: TwoFactorChallenges,
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async status(userId: number) {
    return { enabled: await this.isEnabled(userId) };
  }

  async isEnabled(userId: number) {
    return !!(await this.twoFactor.find(userId))?.enabled_at;
  }

  /** A new secret, pending until enable() gets its first code. */
  async setup(userId: number, accountName: string) {
    if (await this.isEnabled(userId)) {
      throw new ConflictException("2FA ist bereits aktiviert");
    }
    const secret = this.totp.generateSecret();
    await this.twoFactor.savePending(userId, this.cipher.encrypt(secret));
    // a new secret: the steps of an old one say nothing about it
    this.lastStep.delete(userId);
    const { otpauthUrl, qrCode } = await this.totp.provisioning(
      secret,
      accountName,
    );
    return { secret, otpauth_url: otpauthUrl, qr_code: qrCode };
  }

  async enable(userId: number, code: string) {
    const row = await this.twoFactor.find(userId);
    if (!row || row.enabled_at) {
      throw new BadRequestException("Keine 2FA-Einrichtung offen");
    }
    if (!this.accept(row, code)) {
      throw new BadRequestException("Ungültiger Code");
    }
    await this.twoFactor.markEnabled(userId, new Date());
    // sessions from before 2FA end, like after a password change (review M32)
    await this.refreshTokens.revokeAllForUser(userId);
  }

  async disable(userId: number, code: string) {
    const row = await this.twoFactor.find(userId);
    if (!row?.enabled_at) {
      throw new BadRequestException("2FA ist nicht aktiviert");
    }
    if (!this.accept(row, code)) {
      throw new BadRequestException("Ungültiger Code");
    }
    await this.twoFactor.delete(userId);
    this.lastStep.delete(userId);
  }

  /** The admin reset (decision Q8d): the user signs in with the password alone. */
  async reset(userId: number) {
    if (userId === GHOST_USER_ID || !(await this.users.findById(userId))) {
      throw new NotFoundException(`Benutzer ${userId} nicht gefunden`);
    }
    await this.twoFactor.delete(userId);
    this.lastStep.delete(userId);
    this.failures.delete(userId);
  }

  /** After the password: what the client sends back with the code. */
  challenge(userId: number) {
    return this.challenges.sign(userId);
  }

  /** The login's second step: the user, or 401 (UC-01b). */
  async verifyLogin(challengeToken: string, code: string): Promise<number> {
    this.forgetExpiredChallenges();
    const userId = this.usedChallenges.has(challengeToken)
      ? null
      : this.challenges.verify(challengeToken);
    const row = userId === null ? null : await this.twoFactor.find(userId);
    if (!row?.enabled_at || !this.accept(row, code)) {
      throw new UnauthorizedException("Ungültiger oder abgelaufener Code");
    }
    // one session per challenge (review M32)
    this.usedChallenges.set(challengeToken, Date.now() + CHALLENGE_TTL_MS);
    return row.user_id;
  }

  /** Whether the code is right and new; counts wrong codes, 429 while locked. */
  private accept(row: TwoFactorRecord, code: string) {
    const now = Date.now();
    const failed = this.failures.get(row.user_id);
    if (failed && failed.lockedUntil > now) {
      throw new HttpException(
        "Zu viele falsche Codes. Bitte später erneut versuchen.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const step = this.totp.matchStep(
      code,
      this.cipher.decrypt(row.secret_encrypted),
      new Date(now),
    );
    if (step === null || step <= (this.lastStep.get(row.user_id) ?? -1)) {
      const count = (failed && failed.lockedUntil === 0 ? failed.count : 0) + 1;
      this.failures.set(row.user_id, {
        count: count >= MAX_FAILURES ? 0 : count,
        lockedUntil: count >= MAX_FAILURES ? now + LOCK_MS : 0,
      });
      return false;
    }
    this.failures.delete(row.user_id);
    this.lastStep.set(row.user_id, step);
    return true;
  }

  private forgetExpiredChallenges() {
    const now = Date.now();
    for (const [token, expiresAt] of this.usedChallenges) {
      if (expiresAt <= now) this.usedChallenges.delete(token);
    }
  }
}
