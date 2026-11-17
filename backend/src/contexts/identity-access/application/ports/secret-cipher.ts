/** Encrypts the TOTP secrets at rest (port; AES-256-GCM in infrastructure). */
export abstract class SecretCipher {
  abstract encrypt(plain: string): string;
  /** Throws for a tampered value or another key. */
  abstract decrypt(stored: string): string;
}
