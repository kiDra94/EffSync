/**
 * Password-reset tokens (decision Q8a): signed with a key that contains the
 * user's current password hash, so a token stops working once the password
 * has changed. Port; the JWT implementation is in infrastructure.
 */
export abstract class ResetTokens {
  abstract sign(userId: number, passwordHash: string): string;
  /** The user id of a reset token, unverified; null for any other token. */
  abstract subjectOf(token: string): number | null;
  /** Whether the reset token is valid for this password hash and not expired. */
  abstract verify(token: string, passwordHash: string): boolean;
}
