import type { Prisma } from "@prisma/client";

type RefreshTokenWithUser = Prisma.refresh_tokensGetPayload<{
  include: { users: { include: { user_roles: { include: { roles: true } } } } };
}>;

export interface NewRefreshToken {
  user_id: number;
  token_hash: string;
  expires_at: Date;
}

/** Login sessions (decision Q8b): rows hold only the token's hash. */
export abstract class RefreshTokenRepository {
  abstract create(token: NewRefreshToken): Promise<{ id: number }>;
  /** The not revoked, not expired session with this hash, with its user and roles. */
  abstract findActiveByHash(
    tokenHash: string,
  ): Promise<RefreshTokenWithUser | null>;
  /** Revokes the row if it is still active; false if someone else revoked it first. */
  abstract revokeIfActive(id: number): Promise<boolean>;
  /** Revokes the active session with this hash, if there is one. */
  abstract revokeActiveByHash(tokenHash: string): Promise<void>;
  /** Deletes the rows whose expiry has passed; returns how many. */
  abstract deleteExpired(): Promise<number>;
}
