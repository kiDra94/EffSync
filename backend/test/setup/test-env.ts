import { config } from "dotenv";
import { resolve } from "path";

/**
 * Loads backend/.env.test and makes sure the E2E tests can only ever talk to
 * a dedicated test database (GOALS.md M3).
 *
 * `override: true` matters: prisma.config.ts, test-seed.ts and the Nest
 * ConfigModule all load `.env` (the dev database), but none of them overrides
 * a variable that is already set. So the test values have to be in
 * process.env before anything else reads them.
 */
export function loadTestEnv(): string {
  config({
    path: resolve(__dirname, "../../.env.test"),
    override: true,
    quiet: true,
  });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("E2E: DATABASE_URL missing in backend/.env.test");
  }

  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `E2E: refusing to run against database "${databaseName}". The E2E tests reset the database, so its name must end in "_test".`,
    );
  }

  return url;
}
