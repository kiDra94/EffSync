# Refactoring Progress – EffSync

This file is the running log for the refactoring planned in [GOALS.md](GOALS.md).

Each work session adds one entry at the bottom (newest last) with:

- **Date and milestone(s)** worked on (e.g. `2026-11-10 – M1`)
- **Done:** what was changed, with commit hashes
- **Verified:** which checks were run and their results (tests, coverage, lint, manual checks)
- **Learned:** anything surprising about the code that later sessions should know
- **Failed / open:** what didn't work, was rolled back or is left unfinished, and why

Tick the milestone checkbox in GOALS.md only when its "Done when" condition is verified.

---

<!-- Session entries go below this line. -->

## 2026-11-06 – M1: Characterization tests for tasks and documents

**Done:**
- Added `backend/src/modules/tasks/tasks.service.characterization.spec.ts` (52 tests) and `backend/src/modules/documents/documents.service.characterization.spec.ts` (42 tests). Only test files were added; no source file changed.
- They use a mocked Prisma client (as in `task-members.service.spec.ts`) and construct the services directly.
- Markers for later milestones:
  - `// THESIS: T100` – COMPLETED accepted with progress < 100 (M16)
  - `// THESIS: T107` – auto-completion notifies only creator and assignee (M16)
  - `// THESIS: T32` – log entries deleted with the task, delete not logged, log write outside the transaction (M15)
  - `// BUG (problem 1)` – search dropped for students (M7)
  - `// BUG (decision B3)` – student page plus descendants, `meta.total` counts the merged list (M17)
  - `// DECISION: Q10` – German alias "Lehrer" (M7)
  - `// BUG (problem 10)` – `getDocumentsByTask` uploader always `null` (M19)
  - `// BUG (problem 4)` – `findAll` looks up the user's roles twice per request (M7)
  - `// BUG (M15)` – the own-parent check in `changeTaskParent` is dead code, and its error differs from `update()`
  - `// BUG (M19)` – `allowResubmit` unlocks the task but sets `locked_until` to the new deadline
- The existing spec files were left unchanged.

**Verified:**
- `npx jest --coverage` for the two files: `tasks.service.ts` 97.87 % lines (before 34.75 %), `documents.service.ts` 91.09 % lines (before 58.9 %). Target ≥ 70 % met.
- Full backend suite: 45 suites, 224 tests, all pass. `npx tsc --noEmit` passes.
- Mutation check: temporarily changing the student visibility filter (`where.OR` → `where.AND`, `tasks.service.ts:129`) and the "graded documents can't be deleted" rule (`documents.service.ts:401`) made 3 tests fail; both files were restored with `git checkout`.
- M1 has no CI condition; CI runs only the unit tests, which pass locally.
- `code-review` (medium) on the diff: no defects in the code. It flagged 9 weak spots in tests; the 7 in the M1 files are fixed (grading rejections now assert the specific message, the download test uses a fresh temp dir instead of the cwd, the update fixture is rebuilt per test, a redundant mock was removed, and three quirks got markers plus an assertion).

**Learned (for later milestones):**
- `update()` writes the activity-log entry under the task **creator**, not the acting user (`tasks.service.ts:398-402`). Relevant for the audit log (T32/T33, M15, M27).
- `findeOneWithSubtasks()` builds the tree only from tasks with the same `created_by` as the root (`tasks.service.ts:301-303`), so subtasks created by other users are missing from the tree. Relevant for M15.
- `changeTaskParent(id, id)` reports "Circular reference detected" instead of "Task cannot be its own parent", because the circular check runs before the self check (`tasks.service.ts:587-590`).
- `create()` with an unknown priority throws "Priority task with ID null not found!" (prints the lookup result, `tasks.service.ts:43`).
- The inline delete permission check tests the READ bit (4), not a delete flag (`tasks.service.ts:470`, problem 5).
- Teachers can never delete documents, not even on their own tasks; only Admin/Superuser and students (own, ungraded) can (`documents.service.ts:392-408`).
- `isStudentContext()` checks the DB student profile before the role claim, so a user with a student profile counts as a student whatever the claim says.

**Failed / open:**
- Two review findings are outside M1 and were left as they are: `tasks.service.spec.ts:168` leaves a `findMany` mock implementation active for later tests (it only uses `jest.clearAllMocks()`), and `frontend/tests/integration/TaskMembers.integration.spec.js:46` still mocks `usersApi.getAll`, which the component no longer calls. Both can be cleaned up when those areas are touched (M15, M25).
- The two new spec files have 20 `no-unsafe-*` lint errors (the services return `any`, and `expect.objectContaining()` is typed `any`). The existing specs use the same pattern. Per decision Q13 these rules go to `warn` in M4 and back to `error` per context during the migration. Prettier formatting is clean.

## 2026-11-06 – M2: Characterization tests for permissions, task members, users, auth and chat rooms

**Done:**
- Moved the orphaned `backend/test/task-members.service.spec.ts` (matched by no jest config, T127) into `src/modules/task-members/task-members.service.spec.ts`. Its four `addMember` tests were new; its other 14 duplicated existing tests and were dropped. The old file is deleted. Before deleting it I ran it once with an ad-hoc `--rootDir`: all 18 tests passed.
- New spec files (only tests; no source file changed):
  - `auth/guards/permissions.guard.characterization.spec.ts`: `a|b` OR inside an entry, AND across entries, missing user, empty `@Permissions()`, always the READ flag
  - `permissions/permissions.service.characterization.spec.ts`: validity window, flag bitmask table, singular/plural aliases, role fallback, `hasAnyPermission`/`hasAllPermissions`
  - `users/users.service.characterization.spec.ts`: hard delete, permission and role management, last-Superuser/Admin protection
  - `auth/auth.service.characterization.spec.ts`: bcrypt cost, username-only login, token payload
  - `chat-rooms/chat-rooms.controller.characterization.spec.ts`: runs through real HTTP routing (`supertest`, guards overridden, the same global `ValidationPipe` as `main.ts`) to pin the `DELETE /:id` collision
  - `chat-rooms/chat-rooms.service.characterization.spec.ts`: membership, leaving, deletion, `assertIsCreator`
- Markers:
  - `// THESIS: T02` (and T114) – `POST /:id` and `POST /:id/members` add the body's user unchecked; `DELETE /:id` reaches `leaveRoom` with the body's user, and `deleteRoom` is unreachable (M6)
  - `// THESIS: T10` – `users.remove` hard-deletes (M14)
  - `// THESIS: T50` – bcrypt cost 10 in `register`, `setNewPassword` and `users.create` (M9)
  - `// THESIS: T49` – login looks up the username only (M9)
  - `// THESIS: T54` – `@Permissions()` without arguments lets everything through (M8)
  - `// THESIS: T94` – the guard always checks READ (M8)
  - `// THESIS: T128` – `findRoomsByUser` lists rooms the user has left (M6)

**Verified:**
- Coverage: `users.service.ts` 98.86 % lines (before 7.95 %; target ≥ 60 %), `permissions.service.ts` 100 % (before 68.08 %; target ≥ 80 %). Also `permissions.guard.ts` 100 %, `auth.service.ts` 100 %, `chat-rooms.service.ts` 100 %, `chat-rooms.controller.ts` 93.5 %: the only uncovered lines are `deleteRoom` (`:63-64`), which the route collision makes unreachable.
- Full backend suite: 51 suites, 306 tests, all pass. `npx tsc --noEmit` passes.
- `code-review` (medium) on the staged diff: no defects, 10 weak spots. Fixed 8: the HTTP test now uses the production `ValidationPipe` (plus a test that unknown body fields get 400) and sets only `req.user.userId`; the moved `addMember` tests assert the written data and that the 403 comes before the target lookup; the role-fallback mock answers only for the queried permission name (plus a test that another name's role permission grants nothing); registration asserts the role lookup and the found role id; a dead `afterEach` was removed; the guard spec got the `.characterization.spec.ts` suffix. Not done: removing the cases that overlap with `permissions.service.spec.ts`, and a shared Prisma mock helper (better done when the specs move into the contexts, M11+).
- The chat-room routing test confirms the collision through HTTP: `DELETE /chat/rooms/1` with `{ userId: 9 }` calls `leaveRoom(1, 9)` and never `assertIsCreator` or `deleteRoom`.

**Learned (for later milestones):**
- `PATCH /chat/rooms/:id` renames any room without a creator check (M6 should cover it with the other membership fixes).
- `hasPermission` uses only the first matching role permission (`roles_permissions[0]`), so a second role with more flags is ignored (M8).
- `hasPermission` also tries the singular/plural alias (`delete_tasks` ↔ `delete_task`, `manage_system` ↔ `manage_systems`), doubling the queries for every miss (M8, M17 query count).
- `createRoom` stores a client-supplied `direct_chat_hash` as is; the server never builds it (T113, M21).
- Login returns the role "user" for accounts without a role.

**Failed / open:**
- New spec files: 7 `no-unsafe-*` lint errors (typed-`any` Jest matchers, `mock.calls`), handled per decision Q13. The moved block in `task-members.service.spec.ts` keeps that file's existing single-quote style (9 more Prettier warnings on top of its 90); the formatting commit in M4 fixes the file as a whole.

## 2026-11-06 – M3: Automated E2E setup with a separate test database and `test-seed.ts`

**Done:**
- Separate test database: `backend/docker-compose.test.yml` (postgres:17-alpine on port 5433, DB `effsync_test`, tmpfs) and `backend/.env.test` (test values only; `.gitignore` gets `!.env.test`).
- `test/setup/test-env.ts` loads `.env.test` with `override: true` and refuses any database whose name doesn't end in `_test`. `ConfigModule` ignores `.env` when `NODE_ENV=test`, so keys missing from `.env.test` don't leak in from the developer's `.env`.
- Jest `globalSetup` (`test/setup/global-setup.ts`): checks that the test DB is reachable (with a hint to start the container), then runs `prisma migrate reset --force` and `prisma/test-seed.ts` (T122, `08_…:105`). Prisma 7's reset no longer seeds on its own, so the seed runs explicitly. Jest runs with `maxWorkers: 1`.
- `src/app.setup.ts` (`configureApp`) holds everything `main.ts` used to configure: helmet, CORS, the `api` prefix, the `ValidationPipe`, the `/api/uploads/` static route and Swagger. `main.ts` and `test/setup/create-test-app.ts` both call it, so E2E tests hit the real production routes (T130).
- The three E2E files use `createTestApp`. `app.e2e-spec.ts` checks what production really serves at `/api` (the Swagger UI, see Learned), `/api-json` and a 404 outside the prefix. `auth-throttle` sends a valid `CreateUserDto`; the old body only passed because the old test app skipped the pipe. `mitgliederverwaltung` uses `MEMBERS_BASE = '/api/api/tasks'`, marked `// THESIS: T130`.
- Open-handle warning fixed: `@prisma/adapter-pg` doesn't end a pool it was handed unless `disposeExternalPool: true` is set. It's now set in `PrismaService`, `prisma/test-seed.ts` and `prisma/seed.ts` (the seeds had the same leak). There's a new unit test for it, written first and mutation-checked.
- CI: new `backend-e2e` job with a Postgres service container on port 5433.
- README: seed warning (decision B1) and instructions for the E2E tests. `backend/uploads-test/` is gitignored.

**Verified:**
- `npm run test:e2e` twice in a row on a fresh container: 3 suites, 19 tests, both runs identical, no "Jest did not exit" warning, about 13 s per run. Afterwards the data was in `effsync_test` (11 users, 6 tasks); the dev DB (`devdb`, port 5432) was never used.
- `act -j backend-e2e` and `act -j backend-tests`: both jobs succeeded (19 and 307 tests).
- Backend unit suite: 51 suites, 307 tests pass. `npx tsc --noEmit` passes.
- `code-review` (high) on the diff: 10 findings, 8 fixed:
  - Swagger and the static route moved into `configureApp`, and the `/api` test fixed.
  - `disposeExternalPool` instead of ending the pool by hand (this also covers the seeds and the missing try/finally).
  - Env isolation through `ignoreEnvFile`.
  - `uploads-test/` added to `.gitignore`.
  - `createTestApp` returns `INestApplication<App>` (no more casts).
  - Mocks are restored in `afterEach`.
  
  Not fixed: the double cleanup (`migrate reset` plus the seed's `TRUNCATE`), because the thesis names `migrate reset --force` and the extra cost is under a second on tmpfs. Also not fixed: the database settings repeated in `.env.test`, `docker-compose.test.yml` and `ci.yml`; a service container is the usual CI pattern, and the comment in `ci.yml` points to the other two files.

**Learned (for later milestones):**
- Swagger is registered at `api`, so it answers `GET /api` and `AppController.getHello` is unreachable in production. It's a candidate for M5 (unused code).
- Prisma 7 blocks `migrate reset` when an AI agent runs it, unless `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` holds the user's consent. The user consented for the `effsync_test` DB on port 5433 for the #144 E2E tests. CI isn't affected.
- `CommentsModule` and `EmailModule` each provide their own `PrismaService`, so the app opens three pools (log line "Database connected" several times). Clean this up when the modules move into the contexts (M11+).
- `act` runs services with host networking, so the local test container must be stopped first (port 5433).

**Failed / open:**
- `prisma.service.ts:24` (`error.message` on `any`) is an existing `no-unsafe-member-access` error, handled per decision Q13 (M4). `mitgliederverwaltung.e2e-spec.ts` was already not Prettier-clean before M3; the M4 formatting commit fixes it.

## 2026-11-06 – M4: Make lint and build usable and add them to CI

**Done:**
- Formatting-only commit `92e9ecb`: `eslint --fix` (with the prettier rule) on the backend. 108 files changed. tsc, the 307 unit tests and `nest build` were unchanged. The commit is listed in the new `.git-blame-ignore-revs` (`git config blame.ignoreRevsFile .git-blame-ignore-revs`). On the frontend, `eslint --fix` changed nothing; it has no Prettier setup.
- `lint:check` scripts without `--fix` in both projects. The backend one runs with `--max-warnings 554` as a ratchet, so new unsafe code fails CI. Frontend `build` is now `vite build` (decision Q11).
- Backend lint (decision Q13): `no-unsafe-member-access`, `no-unsafe-assignment`, `no-unsafe-return` and `no-unsafe-enum-comparison` are `warn`. The other 36 errors are fixed without behavior changes:
  - `async` without `await` removed from `getProfile`, `googleAuthCallback`, `generateJwtFromGoogleUser` and `WsJwtGuard.canActivate`; the caller and the specs are adjusted.
  - `Function` replaced by `VerifyCallback` in the Google strategy (`done(error, false)`).
  - `no-control-regex` disabled with a reason on the file-name sanitizer; useless escapes removed.
  - `String(newDeadline)` in a log template.
  - Specs: `unbound-method` fixed by asserting on the mock objects; redundant `@ts-ignore` removed, since bracket access to private members needs none.
- Frontend lint: Vitest globals for `*.spec.js`, `*.test.js`, `tests/` and `vitest.setup.js`, and the Cypress globals config for `cypress/`. Then the remaining 31 errors:
  - Unused variables, imports and catch bindings removed.
  - `Badge` and `Dashboard` added as exceptions to `multi-word-component-names` (renaming is out of scope).
  - The calendar lesson cards get a real `:key`.
  - `require('vue')` in `vitest.setup.js` replaced by `vi.importActual`.
- The 4 `no-undef` hits in source files checked as possible bugs (Q13): none is a live bug. The three in `StatusDistributionChart.vue` were in an uncalled `closeModal` left over from a removed modal (deleted). `require` in `vitest.setup.js` worked at runtime. So no extra tests were needed.
- CI: `lint:check` and `build` steps in the frontend and backend jobs.

**Verified:**
- `npm run lint:check` exits 0 in both projects. Frontend: 0 problems. Backend: 0 errors, **baseline 554 `no-unsafe-*` warnings** (290 member-access, 129 assignment, 108 argument, 24 return, 3 enum-comparison).
- `npm run build` exits 0 in both projects.
- Tests: backend 307/307, frontend 142/142. The Vitest results per test are identical with the old and the new `vitest.setup.js`.
- `act`: `frontend-tests`, `backend-tests` (both with the new Lint and Build steps) and `backend-e2e` all succeeded.
- `code-review` (high): no runtime behavior change in the lint fixes. 10 findings, fixed:
  - `:key="lesson.id"` was always undefined, because the mapper copied the missing `lesson.id` while rows have `slot_id`. It now maps `slot_id`, and the week view uses the same key instead of the index.
  - The Cypress close test asserts the initial count of 4.
  - Added the `--max-warnings` ratchet.
  - Finished the half-migrated mock handle in `permissions.service.spec.ts`.
  - Removed dead `prisma` variables in two specs.
  
  Not done:
  - Removing the `$transaction` mock in `documents.service.spec.ts`: the reviewer said it was dead, but 3 tests fail without it.
  - Merging `lint` and `lint:check` on the frontend: both projects keep the same CI script name.
  - The two findings listed under Learned.

**Learned (for later milestones):**
- `cypress/e2e/notifications.cy.js` (`:76`, `:145`, `:389`): `mockAuthSession()` calls `cy.window()` inside `onBeforeLoad`, so the auth seed is queued until after the page has loaded. It should write to `win.localStorage` directly. This is an existing bug, not caused by the lint fix (M25 or the next Cypress work).
- Unfinished features found as unused code and removed:
  - `LayoutView.closeSearch`: click-outside for the search results was never registered, so the dropdown stays open (M25/M26 UI work).
  - `AddMemberDialog.isMemberAlready`: existing members aren't marked in the dialog.
  - `DocumentView.isPreviewable`.
  - `CalendarSettings.activeStatuses`/`activePriorities`: the filters are computed but not applied there.
- The documents tests need a `$transaction` mock even though `documents.service.ts` doesn't call it directly; it's reached through a helper.

**Failed / open:**
- No new Vitest test for the calendar key fix: `CalendarView.vue` has no test yet, and the key only affects how Vue patches the list. It's covered when the calendar gets tests (M26).
