/** Time-based one-time passwords, RFC 6238 (port; otplib in infrastructure). */
export abstract class Totp {
  /** A new random secret, base32 as authenticator apps take it. */
  abstract generateSecret(): string;
  /** The otpauth:// URL for the apps and its QR code as a data URL. */
  abstract provisioning(
    secret: string,
    accountName: string,
  ): Promise<{ otpauthUrl: string; qrCode: string }>;
  /**
   * The 30-second time step the 6-digit code belongs to, one step of clock
   * drift either way, or null for a wrong code.
   */
  abstract matchStep(code: string, secret: string, now: Date): number | null;
}
