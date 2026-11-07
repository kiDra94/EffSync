import { validateEnv } from "./env.validation";

// T14, problem 8 (M9): the app refuses to start without its secrets
describe("validateEnv", () => {
  const valid = {
    JWT_SECRET: "a-secret",
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  };

  it("accepts a configuration with JWT_SECRET and DATABASE_URL", () => {
    expect(validateEnv({ ...valid, OTHER: "x" })).toMatchObject(valid);
  });

  it.each(["JWT_SECRET", "DATABASE_URL"])(
    "fails with a clear error when %s is missing or empty",
    (key) => {
      expect(() => validateEnv({ ...valid, [key]: undefined })).toThrow(
        `Missing required environment variable: ${key}`,
      );
      expect(() => validateEnv({ ...valid, [key]: "  " })).toThrow(key);
    },
  );

  // M9 review: the public placeholder from .env.example is no secret
  describe("in production", () => {
    const prod = {
      ...valid,
      NODE_ENV: "production",
      JWT_SECRET: "a".repeat(32),
      FRONTEND_URL: "https://effsync.example",
    };

    it("accepts a long secret and a FRONTEND_URL", () => {
      expect(() => validateEnv(prod)).not.toThrow();
    });

    it("rejects the .env.example placeholder and short secrets", () => {
      expect(() =>
        validateEnv({
          ...prod,
          JWT_SECRET: "your-super-secret-jwt-key-change-this-in-production",
        }),
      ).toThrow("JWT_SECRET");
      expect(() => validateEnv({ ...prod, JWT_SECRET: "short" })).toThrow(
        "JWT_SECRET",
      );
    });

    it("requires FRONTEND_URL", () => {
      expect(() => validateEnv({ ...prod, FRONTEND_URL: undefined })).toThrow(
        "FRONTEND_URL",
      );
    });
  });
});
