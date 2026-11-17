/**
 * The proof between the two login steps (UC-01b): the password was right,
 * the code is still missing. Never usable as an access token (port; JWT in
 * infrastructure).
 */
export abstract class TwoFactorChallenges {
  abstract sign(userId: number): string;
  /** The user, or null for an invalid or expired challenge. */
  abstract verify(token: string): number | null;
}
