/** A user's TOTP secret (table user_two_factor, decision Q8d, M32). */
export interface TwoFactorRecord {
  user_id: number;
  secret_encrypted: string;
  /** null while the setup waits for its first code */
  enabled_at: Date | null;
}

/** The TOTP secrets (port; Prisma in infrastructure). */
export abstract class TwoFactorRepository {
  abstract find(userId: number): Promise<TwoFactorRecord | null>;
  /** Stores a new secret that isn't enabled yet, replacing a pending one. */
  abstract savePending(userId: number, secretEncrypted: string): Promise<void>;
  abstract markEnabled(userId: number, at: Date): Promise<void>;
  /** Whether there was a row to delete. */
  abstract delete(userId: number): Promise<boolean>;
}
