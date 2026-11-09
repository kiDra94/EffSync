/**
 * Validates the environment at startup (T14, problem 8): without these the
 * app would run with an undefined JWT secret or no database.
 */
const REQUIRED = [
  "JWT_SECRET",
  "DATABASE_URL",
  // M32 (decision Q8d): encrypts the TOTP secrets
  "TWO_FACTOR_ENCRYPTION_KEY",
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of REQUIRED) {
    const value = config[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  // AES-256 takes 32 bytes; `openssl rand -hex 32` writes them in hex
  if (!/^[0-9a-fA-F]{64}$/.test(String(config.TWO_FACTOR_ENCRYPTION_KEY))) {
    throw new Error(
      "TWO_FACTOR_ENCRYPTION_KEY must be 64 hex characters (openssl rand -hex 32)",
    );
  }
  if (config.NODE_ENV === "production") {
    const secret = String(config.JWT_SECRET);
    // the .env.example placeholder is public, so it is no secret (M9 review)
    if (secret.length < 32 || secret.includes("change-this")) {
      throw new Error(
        "JWT_SECRET must be a random value of at least 32 characters in production",
      );
    }
    if (typeof config.FRONTEND_URL !== "string" || !config.FRONTEND_URL) {
      throw new Error("Missing required environment variable: FRONTEND_URL");
    }
    // the HTTPS redirect's target (T62, review M30)
    if (
      typeof config.PUBLIC_URL !== "string" ||
      !config.PUBLIC_URL.startsWith("https://")
    ) {
      throw new Error(
        "PUBLIC_URL must be the backend's https:// address in production",
      );
    }
  }
  return config;
}
