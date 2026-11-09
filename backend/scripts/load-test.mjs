// Load test of the main API endpoints (GOALS.md M30, T61: NFA-01 < 200 ms
// at normal load, NFA-03 100 concurrent users).
//
// Runs against a backend started on the seeded test database, e.g.
//   THROTTLE_LIMIT=1000000 PORT=3001 NODE_ENV=test node dist/src/main.js
// (each simulated user is a separate client; one IP for all of them would
// otherwise hit the per-IP rate limit), then:
//   node scripts/load-test.mjs [baseUrl] [--duration=10]
//
// Every endpoint runs once with 10 connections (normal load) and once with
// 100 (NFA-03), round-robin over a teacher's, a student's and an admin's
// token. It prints p50/p90/p97.5/p99 latency, requests per second and the number
// of failed (non-2xx or errored) requests, and exits 1 if a target is missed.
import autocannon from "autocannon";

const base = (process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : "http://localhost:3001"
).replace(/\/$/, "");
const duration = Number(
  (process.argv.find((arg) => arg.startsWith("--duration=")) ?? "=10").split("=")[1],
);
// the tokens are fetched once and last 15 minutes (JWT_EXPIRATION); ten runs
// of 60 s plus the login waits stay inside that (review M30)
const MAX_DURATION = 60;
if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION) {
  console.error(`--duration must be a whole number of seconds, 1-${MAX_DURATION}`);
  process.exit(2);
}

const USERS = ["alehrerin", "ffuchs", "adminadmin"];
const NORMAL = 10;
const PEAK = 100;
// autocannon reports p90 and p97.5, not p95: the target uses p97.5, which
// is stricter
const P975_LIMIT_MS = 200;

// the login route allows 3 attempts a minute (T49); a run right after
// another one waits for the window instead of failing
async function login(identifier) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password: "password123" }),
    });
    if (res.ok) return (await res.json()).token;
    if (res.status !== 429) throw new Error(`login ${identifier}: ${res.status}`);
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  throw new Error(`login ${identifier}: still throttled`);
}

async function firstVisibleTaskId(token) {
  const res = await fetch(`${base}/api/tasks?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()).data[0].task_id;
}

function run(path, connections, tokens) {
  let next = 0;
  return autocannon({
    url: `${base}${path}`,
    connections,
    duration,
    // every connection is one user with one of the three tokens
    setupClient(client) {
      client.setHeaders({ authorization: `Bearer ${tokens[next++ % tokens.length]}` });
    },
  });
}

const tokens = [];
for (const user of USERS) tokens.push(await login(user));
// a task each of the three users sees (the student's first task)
const taskId = await firstVisibleTaskId(tokens[1]);

const endpoints = [
  ["GET /api/tasks (list, page 1)", "/api/tasks?page=1&limit=20"],
  [`GET /api/tasks/${taskId} (detail)`, `/api/tasks/${taskId}`],
  ["GET /api/metrics/task-progress", "/api/metrics/task-progress"],
  ["GET /api/notifications", "/api/notifications"],
  ["GET /api/chat-rooms", "/api/chat-rooms"],
];

const rows = [];
let failed = false;
for (const [name, path] of endpoints) {
  for (const connections of [NORMAL, PEAK]) {
    const result = await run(path, connections, tokens);
    const errors = result.non2xx + result.errors + result.timeouts;
    const row = {
      endpoint: name,
      connections,
      p50: result.latency.p50,
      p90: result.latency.p90,
      p97_5: result.latency.p97_5,
      p99: result.latency.p99,
      rps: Math.round(result.requests.average),
      requests: result.requests.total,
      failed: errors,
    };
    rows.push(row);
    // NFA-01: p97.5 under 200 ms at normal load; NFA-03: no failure at 100
    if (connections === NORMAL && row.p97_5 >= P975_LIMIT_MS) failed = true;
    if (errors > 0) failed = true;
  }
}

console.table(rows);
console.log(JSON.stringify({ base, duration, rows }, null, 2));
// exitCode, not exit(): exit() can cut off stdout when it goes to a pipe
process.exitCode = failed ? 1 : 0;

