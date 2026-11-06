// Runs in every Jest worker before the test files are loaded (setupFiles in
// jest-e2e.json), so PrismaService reads the test database URL.
import { loadTestEnv } from "./test-env";

loadTestEnv();
