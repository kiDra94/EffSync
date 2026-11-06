import { execSync } from "child_process";
import { resolve } from "path";
import { Client } from "pg";
import { loadTestEnv } from "./test-env";

const backendDir = resolve(__dirname, "../..");

async function assertDatabaseReachable(url: string) {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `E2E: test database not reachable (${reason}). Start it with: docker compose -f docker-compose.test.yml up -d`,
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

function run(command: string) {
  try {
    execSync(command, { cwd: backendDir, env: process.env, stdio: "pipe" });
  } catch (error) {
    const output = (error as { stdout?: Buffer; stderr?: Buffer }) ?? {};
    console.error(output.stdout?.toString(), output.stderr?.toString());
    throw new Error(`E2E setup failed: ${command}`);
  }
}

/**
 * Before the API suite: reset the test database completely and refill it
 * from prisma/test-seed.ts (thesis 08_…:105, T122). Prisma 7's
 * `migrate reset` no longer seeds on its own, so the seed runs explicitly.
 */
export default async function globalSetup() {
  const url = loadTestEnv();
  await assertDatabaseReachable(url);

  run("npx prisma migrate reset --force");
  run("npx ts-node prisma/test-seed.ts");
}
