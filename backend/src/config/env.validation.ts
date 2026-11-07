/**
 * Validates the environment at startup (T14, problem 8): without these the
 * app would run with an undefined JWT secret or no database.
 */
const REQUIRED = ["JWT_SECRET", "DATABASE_URL"] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of REQUIRED) {
    const value = config[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
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
  }
  return config;
}
