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

## 2026-11-07 – M5: Remove unused code

**Done:**
- `1c9b010`: deleted every item with recommendation "Delete" in UNUSED_CODE.md:
  - backend: the 10 empty scaffold modules, the stub modules `templates` and `task-activity`, the unregistered `comments` module, `permission.guard.ts`, `auth/decorators/index.ts`, the 19 empty entities, `mark-as-read.dto.ts`, `create-document.dto.ts`, `generate_all.js`, `diplom_arbeit_postgres.sql`, the `test:permissions` script and `uuid`
  - frontend: `UserProfile.vue`, `NotificationCenter.vue`, `NotificationToast.vue`, `DocumentUploadForm.vue`, the three empty stores, `AddMemberDialog.vue` with its spec (and its two integration tests), `api/index.js`, `@nestjs/swagger`, `uuid` and `happy-dom`
- Repoints in the same commit: `api/taskTemplates.js` calls `/task-templates` (T110). `api/emailPreferences.js` uses `httpClient.js`, so it now gets the `/api` fallback base URL and the 401 → logout and 429 handling like every other API module. That is an intended behavior change in addition to the two route fixes.
- knip: configs for both projects (`knip.jsonc`), a `knip` script and a CI step. knip found 11 more unused items, all removed and listed in UNUSED_CODE.md. Planned items stay as ignores with a pointer to their milestone: `passport-local` (M9), `RoleName` (M7), `GradesView.vue` and `fetchMyGrades` (M27), the lesson-slot CRUD in `api/lessonSlots.js` (M36). `@vitest/coverage-v8` is detected through `coverage.provider` in `vite.config.js`.
- Docs: TESTS_README.md, the structure listings in `documents/` and one flow description updated. The long implementation guides (`mitgliederverwaltung-anleitung.md`, `Phase5a-…`) describe past work and were left as they are.
- `852d7a2`: all German code comments translated to English (decision B2), in 79 files. UI strings and German data stay. The commit is in `.git-blame-ignore-revs` next to M4's formatting commit.
- Decision E1 (2026-11-07): task templates are private (recorded in GOALS.md, applied in M18).

**Verified:**
- Tests first:
  - `test/routes.e2e-spec.ts`: PATCH/DELETE `/api/task-activity/:id` and `/api/templates` gave 200 from the stubs before the deletion, and give 404 after it.
  - `api/taskTemplates.spec.js` and `api/emailPreferences.spec.js` were red before the repoints.
  - `router/router.spec.js`: every route resolves its component. It stands in for the manual click-through; a mutation check (a route pointing at a missing view) made it fail.
- `GET /api-json` before and after: 134 → 127 routes. The diff is exactly the 7 stub routes (5 under `/templates`, PATCH/DELETE `/task-activity/{id}`); GET/POST `/task-activity` remain, now served by the real `TaskActivityLogController`.
- `tsc --noEmit`, `npm run build`, lint (backend 0 errors, 541 warnings, ratchet lowered from 554) and knip pass in both projects. Tests: backend 303 unit (the 4 dropped ones were "should be defined" specs of deleted modules) and 23 E2E; frontend 150.
- `act`: `frontend-tests`, `backend-tests` (both with the knip step) and `backend-e2e` succeeded.
- Translation commit:
  - A parser-based check confirms that every changed file is identical to its previous version once comments are stripped (`.vue` files: script blocks through the TypeScript printer, template and style without comments).
  - Backend `tsc --removeComments` output: byte-identical (191 files).
  - Frontend bundle: **not byte-identical, and it can't be**. `@vitejs/plugin-vue` computes the scoped-CSS id from the SFC source *including comments* in production. That changes the `data-v-…` ids, scoped keyframe names and asset hashes, and through the changed chunk the minifier's local names. After normalizing ids and hashes, a token comparison shows that every token type, string, number, property and export name is equal; only local identifiers differ. The Done-when's byte-identical condition is replaced by this check together with the source-level one.
- `code-review` (high) on the deletion diff: no deletion still referenced at runtime; the lockfiles install with npm 10. 10 findings:
  - fixed: the leftover Badge/Dashboard doc lines, the coverage provider instead of a knip ignore, and the hardcoded route count
  - not done: moving the `@public` tags into `knip.jsonc` (knip's documented mechanism for single exports, each tag names its milestone), and lockfile churn with the local npm 11 (see Learned)
  - the template findings went into M18 (see Learned)

**Learned (for later milestones):**
- The template API is broken end to end. Since M5 the frontend reaches it, but it never worked before either (the stub returned a placeholder string):
  - `basicInclude` selects `first_name`/`last_name` and includes `task` (real names: `firstname`/`lastname`, `tasks`), so every query returns 500.
  - The DTO and `TemplateForm` use `default_*` fields that aren't columns.
  - The API has no owner check and exposes the creator's email.
  
  All of this is in M18 step 3, with decision E1. I deliberately did not fix the field names in M5: a working API without owner checks would expose every user's templates.
- `TaskActivityLogController.findOne` reads `@Param("log_id")` on the route `:id`, so `GET /task-activity/:id` always fails validation (M15).
- Lockfiles must be regenerated with npm 10 (`npx npm@10.9.2 install --package-lock-only`); npm 11 here drops entries that `npm ci` on CI's npm 10 needs (`@emnapi/*` for knip's native resolver).
- ESLint and knip didn't notice a missing default export (`api/metrics.js`); only `vite build` did. Keep the build step in every verification.

**Failed / open:**
- Byte-identical frontend bundle for the translation commit: not achievable (see Verified), replaced by the source-level and token-level checks.

## 2026-11-07 – M6: Chat-room authorization

**Done:**
- Route change (T88, decision Q6/T88). Everything under `/chat-rooms`; nothing is left under `/chat`:

  | Before | After |
  |---|---|
  | `GET/POST /chat/rooms` | `GET/POST /chat-rooms` |
  | `GET/PATCH /chat/rooms/:id` | `GET/PATCH /chat-rooms/:id` (GET: members only; PATCH: creator only) |
  | `DELETE /chat/rooms/:id` → reached `leaveRoom` with a body `userId` | `DELETE /chat-rooms/:id` → `deleteRoom` (creator only) |
  | `POST /chat/rooms/:id` (self-join with a body `userId`) | removed (decision Q14) |
  | `POST /chat/rooms/:id/members` (anyone adds anyone) | `POST /chat-rooms/:id/members` (creator only, `AddChatMemberDto`) |
  | `DELETE /chat/rooms/:id/members/:userId` | `DELETE /chat-rooms/:id/members/:userId`: leaving yourself, or removing someone else as the creator; the removed user's sockets leave the room |
  | `GET/POST /chat/rooms/:id/messages` | `GET/POST /chat-rooms/:id/messages` (GET: members only) |
  | `PATCH/DELETE /chat/messages/:id` | `PATCH/DELETE /chat-rooms/messages/:id` (author who is still a member) |
  | `GET /chat` (every message of every room) | removed (T96; it would also collide with the room list) |

  All `:id` and `:userId` params use `ParseIntPipe`, so a non-numeric id gives 400 instead of a Prisma error.
- `findRoomsByUser` lists only rooms with `left_at: null` (T128); the socket connect joins only those.
- Socket.io (same rules as REST):
  - `join:room` subscribes only an existing member; it no longer creates a membership (it used to let anyone join any room, including other people's direct chats).
  - `invite:room` requires the creator.
  - `leave:room` only unsubscribes the socket. ChatView emits it on every room switch; leaving for good is the REST route.
  - `chat:edit` and `chat:delete` require the author who is still a member (`chat:delete` had no owner check at all).
  - `chat:typing` is relayed only from a socket subscribed to the room.
- `AuthenticatedRequest` type for `req.user` in the chat controllers and a `userIdOf` helper in the gateway, which also removed 42 `no-unsafe-*` warnings. The lint ratchet goes from 541 to 499.
- Frontend: `api/chat.js` follows the new routes, and `editMessage` now sends `message` (it sent `content`, which the DTO rejected with 400).

**Verified:**
- Tests first; all were red before the change:
  - the flipped M2 route tests (`// THESIS: T02`, T114, T128) and new route tests for messages
  - gateway tests for join, invite, leave, edit, delete, typing and unsubscribe
  - `assertIsMember`/`assertCanModify` tests
  - `frontend/src/api/chat.spec.js`
  - `test/chat-rooms.e2e-spec.ts`, which covers leave, removal by the creator, removal by a non-creator (403), adding by the creator, adding by a non-creator member (403), deleting by a non-creator (403), no access to room, messages and own old messages after leaving, and 400 for `/chat-rooms/messages`
- `GET /api-json`: no `/chat/` route; 14 chat routes became 12 (the self-join and `GET /chat` are gone, the rest renamed).
- Backend 332 unit and 31 E2E tests, frontend 154; tsc, lint (0 errors, 499 warnings), knip and build pass. `act`: all three jobs succeeded.
- `code-review` (high), 10 findings, 9 fixed:
  1. Switching rooms in ChatView left the room for good. It emits `leave:room`, which set `left_at`, and `join:room` no longer re-created the membership. Fixed by making `leave:room` unsubscribe only.
  2. `chat:delete` had no owner check.
  3. Removed members kept receiving live messages.
  4. `chat:typing` had no membership check.
  5. Non-numeric ids reached Prisma.
  6. Editing or deleting was still possible after leaving.
  7. The REST edit payload was wrong.
  8. The creator check on room delete ran twice.
  9. The gateway helper was used only in some handlers.
  
  Not done: one shared membership helper for `ChatRoomsService`, `ChatMessagesService.findByRoom` and `validateTrans` (three copies of `left_at: null`; a room that doesn't exist gives 404 on `GET /:id` but 403 on `GET /:id/messages`). That belongs to the chat context in M21.

**Learned (for later milestones):**
- The frontend listens for `chat:typing` with a `roomId`, but the gateway sends only `{ userId, username }` (M21).
- `useChat` and `ChatView` never offer a "leave room" action; with M6 the REST route exists (UI in M21 or M25).
- Login is throttled to 3 per minute per app instance, so an E2E file can log in at most three users.

**Failed / open:** none.

## 2026-11-07 – M7: `RolesGuard` and role checks per thesis (+ search bug)

**First step (decisions Q10, C1), role names of every database in use:**
- `devdb` (local dev DB, port 5432), queried in a read-only session: `Superuser, Student, Teacher, Admin`.
- The test DB `effsync_test` is rebuilt from `prisma/test-seed.ts` on every run; `seed.ts` and `test-seed.ts` both create `Superuser, Student, Teacher, Admin`.
- The user confirmed on 2026-11-07 that no other database is in use. All names are English, so the German aliases could be removed without a rename.

**Done:**
- `RolesGuard` + `@Roles(...)` (T92) with the order token → role → permission (T97): `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` on the tasks and documents controllers. The guard checks the roles in the database with one query (`PermissionsService.hasAnyRole`); `@Roles` takes `RoleName` values.
- `@Roles(...STAFF_ROLES)` on `PATCH /documents/:id/grade` and `PATCH /documents/:id/allow-resubmit`. The services no longer check the JWT's first role there, so a user with several roles gets the same answer from guard and service.
- `PATCH /tasks/:id/deadline-unlock` had no check at all (any user could unlock any task, although it was documented as "only teachers"). It is now staff **or the task's creator**, checked in the service; `TaskForm` offers unlocking to creators, so a pure `@Roles` would have locked them out.
- Role names in one place (problem 4): `RoleName`, `STAFF_ROLES`, `PRIVILEGED_ROLES` and `isRoleIn()` in `config/role-permissions.config.ts` replace the string comparisons in tasks, documents, metrics, users, auth and the Google strategy. `TasksService.findAll` queries the role once instead of twice. `hasRole` is `hasAnyRole` with one role; both compare case-insensitively.
- German role aliases removed (decision Q10): `normalizeRole` in `documents.service.ts` and `DocumentView.vue`; `frontend/mockdb.json` now has `Admin`, `Teacher`, `Student`.
- Search bug (problem 1): search and visibility are combined with `AND`, so a student's search applies within their visible tasks.

**Verified:**
- Tests first, red before the change:
  - M1 tests flipped: one role query, student search with `AND`
  - the M1 alias test flipped (`"Lehrer"` is no teacher any more)
  - the M2 registration test now uses `RoleName.STUDENT`
  - new tests for `hasAnyRole`, `RolesGuard` and the deadline rule
  - `test/guard-order.e2e-spec.ts` (a test controller with `@Roles(Teacher)` and `@Permissions("manage_users")` in the real app): 401 without a token, the role 403 for a student before the permission is looked at, and the permission 403 ("Missing permission: manage_users") for a teacher; 403 for a student on grade and allow-resubmit; on its own task, 403 for a student who isn't the creator and 200 for another teacher
- Done-when greps:
  - `grep -rnE "['\"](Teacher|Student|Admin|Superuser)['\"]" backend/src/modules` (both quote styles, also lower case) finds nothing outside the specs. The milestone's single-quote pattern alone would have missed the double-quoted code after M4's formatting.
  - The alias grep finds only UI texts and surnames in test data ("Lehrer").
- Backend 341 unit and 38 E2E tests, frontend 154; tsc, lint (0 errors, 493 warnings; ratchet 499 → 493), knip and build pass. `act`: all three jobs succeeded.
- `code-review` (high), 10 findings:
  - fixed:
    - the deadline-unlock lockout of creators
    - case-sensitive `hasAnyRole`
    - JWT-role checks behind the new guard (multi-role users)
    - the remaining role literals in the Google strategy
    - the misplaced JSDoc and the unused `hasRole`
    - the three-way filter merge (now always `AND`)
    - the E2E test that changed seed task 1
  - documented: the database check (finding 4), which is recorded above
  - not done:
    - subtasks that don't match the search are still added to a student's page (decision B3, M17)
    - `DocumentsService` still decides read access from the JWT's first role plus its own role query (see Learned)

**Learned (for later milestones):**
- Prisma ignores `mode: "insensitive"` on `in`; the case-insensitive role check is an `OR` of `equals` filters. Only the E2E test against the real database caught this; the mocked unit test passed.
- `DocumentsService` still uses `req.user.role` (the first role, without `orderBy`) for read access and the UI flags (`can_grade` …), plus its own `users.findUnique` role lookup in `canUserReadAllDocumentsContext` and `isStudentContext`. Moving it to `hasAnyRole` changes its "student context" semantics (a student profile or a student role); that belongs to the documents context migration.
- The first role in the JWT depends on the unordered `user_roles` read in `auth.service.ts`; give it an order when the token is reworked (M9).

**Failed / open:** none.


## 2026-11-07 – M8: Permission flags and explicit permissions

**Decisions asked and recorded first** (GOALS.md F1–F4, 2026-11-07):
- F1: the base permission for every-user features is `view_dashboard`.
- F2: Student and Admin get `create_tasks` and `edit_tasks`.
- F3: school administration uses `manage_classes`.
- F4: the seeds follow the config, and a data migration updates existing databases.

**Done:**
- `@Permissions(name, ...more, flag?)` takes at least one permission name (a TypeScript error otherwise) and an optional `PermissionFlag` (READ by default). `PermissionsGuard` checks that flag (T94), and an empty list fails closed (T54).
- Every endpoint behind `PermissionsGuard` has a permission. `UsersController`, `TaskActivityLogController` and `EmailPreferencesController` now use the guard: users had decorators without a guard, and the other two had no permission at all. Only the auth endpoints (login, register, password reset, `/auth/profile`) stay JWT-only or public by design. Table:

| Permission and flag | Endpoints |
|---|---|
| `view_dashboard` READ | `POST /chat-rooms/:id/messages`, `GET /chat-rooms/:id/messages`, `PATCH /chat-rooms/messages/:id`, `DELETE /chat-rooms/messages/:id`, `POST /chat-rooms`, `GET /chat-rooms`, `GET /chat-rooms/:id`, `PATCH /chat-rooms/:id`, `DELETE /chat-rooms/:id`, `POST /chat-rooms/:id/members`, `DELETE /chat-rooms/:id/members/:userId`, `POST /documents/upload`, `GET /documents`, `GET /documents/by-task/:taskId`, `GET /documents/:id/download`, `GET /documents/:id`, `PATCH /documents/:id`, `DELETE /documents/:id`, `GET /email-preferences`, `PUT /email-preferences`, `GET /metrics/status-distribution`, `GET /metrics/task-progress`, `GET /metrics/tasks-by-status`, `POST /notes`, `GET /notes`, `GET /notes/:id`, `PATCH /notes/:id`, `DELETE /notes/:id`, `GET /notifications`, `GET /notifications/unread-count`, `GET /notifications/unread-count`, `GET /notifications/:id`, `PATCH /notifications/:id/read`, `PATCH /notifications/mark-all-read`, `DELETE /notifications/:id`, `GET /task-activity`, `GET /task-activity/:id`, `POST /task-comments`, `GET /task-comments`, `GET /task-comments/:id`, `PATCH /task-comments/:id`, `DELETE /task-comments/:id`, `GET /api/tasks/:taskId/members`, `GET /api/tasks/:taskId/members/check-permission`, `GET /task-templates`, `GET /task-templates/:id`, `GET /tasks`, `GET /tasks/:id/tree`, `GET /tasks/:id`, `GET /tasks/:id/subtasks`, `GET /tasks/:id/comments`, `GET /tasks/:id/activity`, `GET /tasks/:id/documents`, `GET /tasks/:id/can-edit`, `GET /users/profile`, `GET /users/me/permissions`, `GET /users/for-chat` |
| `manage_classes` WRITE | `POST /classes`, `PATCH /classes/:id`, `POST /departments`, `PATCH /departments/:id`, `POST /lesson-slots`, `PATCH /lesson-slots/:id`, `POST /rooms`, `PATCH /rooms/:id`, `POST /schedules`, `PATCH /schedules/:id`, `POST /subjects`, `PATCH /subjects/:id` |
| `view_schedules` READ | `GET /classes`, `GET /classes/:id`, `GET /departments`, `GET /departments/:id`, `GET /lesson-slots`, `GET /lesson-slots/:id`, `GET /rooms`, `GET /rooms/:id`, `GET /schedules`, `GET /schedules/:id`, `GET /subjects`, `GET /subjects/:id` |
| `manage_users` READ | `GET /permissions`, `GET /permissions/:id`, `GET /roles`, `GET /roles/:id`, `GET /users/:id/permissions`, `GET /users`, `GET /users/:id` |
| `edit_tasks` WRITE | `POST /task-activity`, `POST /api/tasks/:taskId/members`, `DELETE /api/tasks/:taskId/members/:userId`, `PATCH /tasks/:id`, `PATCH /tasks/:id/deadline-unlock`, `POST /tasks/:id/lock`, `POST /tasks/:id/unlock` |
| `manage_classes` EXECUTE | `DELETE /classes/:id`, `DELETE /departments/:id`, `DELETE /lesson-slots/:id`, `DELETE /rooms/:id`, `DELETE /schedules/:id`, `DELETE /subjects/:id` |
| `create_tasks` WRITE | `POST /task-templates`, `PATCH /task-templates/:id`, `DELETE /task-templates/:id`, `POST /tasks`, `POST /tasks/:id/subtasks` |
| `manage_users` WRITE | `POST /users`, `PATCH /users/:id`, `POST /users/:id/permissions`, `POST /users/:id/roles` |
| `manage_users` EXECUTE | `DELETE /users/:id`, `DELETE /users/:id/permissions/:permissionId`, `DELETE /users/:id/roles/:roleId` |
| `edit_grades` WRITE | `PATCH /documents/:id/grade`, `PATCH /documents/:id/allow-resubmit` |
| `view_grades` READ | `GET /documents/my-grades` |
| `manage_system` WRITE | `POST /notifications` |
| `edit_tasks|delete_tasks` READ | `DELETE /tasks/:id` |

  Rule: GET → READ, POST/PATCH → WRITE, DELETE → EXECUTE where the permission has it. The base permission `view_dashboard` is READ-only, so every-user features check READ regardless of the method; ownership and membership rules stay in the services. `DELETE /tasks/:id` accepts `edit_tasks|delete_tasks`: the service still requires `delete_tasks` for other people's tasks.
- Socket.io: a connection without `view_dashboard` is refused, so the chat can't bypass the REST permission.
- `role-permissions.config.ts`: Student and Admin got `create_tasks` and `edit_tasks` (F2), and Admin kept grading with `edit_grades` (Admin is in `STAFF_ROLES` and could grade before).
- `seed.ts` and `test-seed.ts` derive `roles_permissions` from the config (`getPermissionsForRole`), so the seeds can't drift from it again (F4). The data migration `20261107120000_sync_role_permissions_with_config` inserts the 31 config pairs that are missing, matching names case-insensitively, with `ON CONFLICT DO NOTHING`.
- `TasksService.remove()` checks through `permissionsService.hasAnyPermission` instead of its own copy of the permission logic (problem 5).

**Verified:**
- Done-when:
  - `grep -rn "@Permissions()"` finds no call without an argument (and the compiler refuses one).
  - Flag tests: the decorator spec, plus the M2 guard tests T54 and T94 flipped.
  - The M1 `remove` tests pass with the spec file unchanged.
  - E2E: `POST /tasks` answers 403 "Missing permission: create_tasks" for a user whose only role was removed.
- `test/permissions.e2e-spec.ts` also covers:
  - a student creates a task (F2)
  - a user without permissions gets 403 on `/users/for-chat`, `/users/profile`, `/task-activity` and `/email-preferences`, while a student gets 200
  - `POST /notifications` needs `manage_system`
  - a student deleting someone else's task gets 403 "Missing permission: delete_tasks"
- Seed check against the table: the seeded users of every role pass all suites (backend 345 unit and 47 E2E tests, frontend 154).
- The migration was tested on the populated test DB: it restored deleted rows, and a second run changed nothing. A read-only preview against `devdb` shows it would add 12 rows there:
  - Admin: `create_tasks`, `edit_grades`, `edit_tasks`, `view_dashboard`, `view_grades`, `view_schedules`
  - Student: `create_tasks`, `edit_tasks`
  - Teacher: `delete_tasks`, `view_dashboard`, `view_grades`, `view_schedules`

  Without them, teachers in `devdb` would be locked out. I did not run it on `devdb`; it runs with the next `prisma migrate dev`.
- tsc, lint (0 errors, 484 warnings; ratchet 493 → 484), knip and build pass. `act`: all three jobs succeeded.
- `code-review` (high), 10 findings:
  - fixed:
    - Admin lost grading
    - decorators without a guard on `/users/*`
    - endpoints without any permission (`/task-activity`, `/email-preferences`)
    - DELETE `/tasks/:id` blocked `delete_tasks` holders
    - `POST /notifications` was open to everyone
    - the socket bypassed `view_dashboard`
    - case-sensitive migration names
    - the duplicate alias in `remove()`
  - not done:
    - A global fail-closed `APP_GUARD` with class-level defaults, which would remove the 54 repeated `view_dashboard` lines. It belongs to the identity-access context (M11).
    - The query cost of the permission checks: 2 queries per name, 4 on a miss.
    - Users without a role (created through `POST /users`, or when a role assignment fails) have no permission at all. That is correct RBAC; an admin assigns the role in AdminView (M35).

**Learned (for later milestones):**
- Before M8 the endpoints with `manage_subjects`, `manage_rooms`, `manage_departments` and `manage_schedules` answered 403 for everyone, because those permissions never existed. The school views store their data in localStorage (problem 19), so nobody noticed (M36).
- `TaskActivityLogController`: `POST /task-activity` lets any user with `edit_tasks` write log entries for any task. Logging belongs inside the task use cases (T32, M15).

**Failed / open:** none.

## 2026-11-07 – M9: Login, hashing and secrets per thesis

**Done:**
- `POST /auth/login` goes through `LocalAuthGuard` + `LocalStrategy` (passport-local, T116). The body field is `identifier`: a username or an e-mail address (T49). The username is matched exactly first, then the e-mail address case-insensitively, so the result is deterministic even if one account's username equals another account's e-mail address. Every failure answers "Ungültige Zugangsdaten" and runs one bcrypt compare, so the response doesn't reveal which accounts exist. `LocalStrategy` checks the input types itself, because the guard runs before the `ValidationPipe`. `LoginDto` has no password length rule any more: registration allowed 7 characters and the reset 6, so a minimum of 8 would have locked those accounts out.
- bcrypt cost 12 (`BCRYPT_COST` in `config/auth.config.ts`) for registration, password change, `POST /users` and both seeds (T50). Existing hashes with cost 10 stay valid; they aren't rehashed.
- Secrets (T14, problem 8):
  - `JWT_SECRET` is read only through `ConfigService` in `config/auth.config.ts` (`jwtSecret`, `jwtModuleOptions`), used by both `JwtModule`s and `JwtStrategy`; the gateway and `WsJwtGuard` use the module's secret.
  - The fallback secret in `jwt.strategy.ts` is gone.
  - `ConfigModule.forRoot({ validate: validateEnv })` requires `JWT_SECRET` and `DATABASE_URL`. In production it also refuses a secret shorter than 32 characters or the `.env.example` placeholder, and requires `FRONTEND_URL`.
- Google callback (decision Q9, problem 9): `/auth-callback#token=…` and `/reset-password#token=…`; no query parameters and no user object in the URL any more. `AuthCallbackView` loads the user from `GET /auth/profile`. Both views take the token through the shared `takeTokenFromHash`, which removes the fragment with `router.replace`; a plain `history.replaceState` would have been undone by vue-router on the next push.
- CSRF by design (T13, decision Q3): documented in the README and in the Swagger bearer description. CORS now only answers `FRONTEND_URL`. Before, a plain origin string made `cors` send `Access-Control-Allow-Origin: <FRONTEND_URL>` to every origin; the Socket.IO gateway had the same issue and now checks the origin per request.
- Frontend: `LoginView` has one "Benutzername oder E-Mail" field (`identifier`), the dev-mode check in `authStore` follows, and the debug logs that printed the token are gone. The Cypress OAuth test uses the fragment.
- knip: the `passport-local` ignore (planned for M9) is removed.

**Verified:**
- Done-when:
  - The M2 tests T49 and T50 are flipped (username-or-e-mail lookup, cost 12 in auth and users).
  - Without `JWT_SECRET` the built app exits with code 1 and "Missing required environment variable: JWT_SECRET". I ran `dist/src/main.js` in an empty directory with only `DATABASE_URL` set.
  - `grep -rn "process.env.JWT_SECRET" backend/src` finds nothing.
  - E2E `test/auth.e2e-spec.ts` covers:
    - login with the username and with the e-mail address in mixed case
    - the Google callback redirect: `/auth-callback`, an empty query and `#token=` with a JWT
    - no `Set-Cookie` on login and on the callback (`// THESIS: T13`)
    - no `Access-Control-Allow-Origin` for a foreign origin's preflight, and the allowed origin for `FRONTEND_URL`
    - the fourth login within a minute gets 429 (the throttle still runs before the guard)
  - `AuthCallbackView` has Vitest tests for the fragment, the profile, the router-based cleanup, the old query format and a failing profile; `takeTokenFromHash` and the `LoginView` identifier have their own tests.
- Unit tests for `LocalStrategy` (types, delegation, 401) and `validateEnv` (missing values, production rules).
- Backend 359 unit and 54 E2E tests, frontend 160; tsc, lint (0 errors, 481 warnings; ratchet 484 → 481), knip and build pass. `act`: all three jobs succeeded.
- `code-review` (high), 10 findings, all fixed:
  1. The history replacement was undone by vue-router.
  2. Non-string credentials gave 500.
  3. The username/e-mail lookup was ambiguous.
  4. The e-mail lookup was case-sensitive.
  5. The error messages and timing revealed which accounts exist.
  6. The login password minimum conflicted with registration and reset.
  7. The placeholder secret was accepted.
  8. Token logging in `authStore`.
  9. The gateway CORS was plain-string and read at import time; production also had no `FRONTEND_URL` check.
  10. The duplicated fragment code and the dead `AuthService.login`.

**Learned (for later milestones):**
- The password rules differ: registration requires 7–32 characters, `set-new-password` and `ResetPasswordView` 6. One policy belongs to the password-reset rework (T52, M13).
- Hashes with cost 10 are not upgraded on login. A rehash on successful login would move existing accounts to cost 12 over time (optional, M13).
- `main.ts` still calls `dotenv.config()`, which `ConfigModule` makes redundant; it is harmless and goes with the context migration.

**Failed / open:** none.

## 2026-11-07 – M10: Context skeleton and dependency rules (warn mode)

**Done:**
- `src/contexts/<context>/{domain,application,infrastructure,presentation}` for the seven contexts (`identity-access`, `task-management`, `communication`, `documents-notes`, `school-organization`, `notifications`, `reporting`), plus `src/shared/{domain,application,infrastructure,presentation}`. `src/contexts/README.md` describes the layers and rules. Each context's NestJS module (`<context>.module.ts`) lives at the context root, outside the layers.
- Moved to `shared/infrastructure`: `PrismaModule` and `PrismaService` (`shared/infrastructure/prisma/`) and the config validation (`shared/infrastructure/config/env.validation.ts`). A script rewrote 75 relative imports. Nothing else moved; `config/auth.config.ts` and `role-permissions.config.ts` go with identity-access in M11.
- Unit of work:
  - `UnitOfWork` (port, `shared/application`) and `Transaction` (opaque type, `shared/domain`, so repository ports in `domain/` can name it) are implemented by `PrismaUnitOfWork` with `prisma.$transaction`.
  - A nested `run()` joins the open transaction through `AsyncLocalStorage`. So a use case that calls another context's use case stays in one transaction, e.g. grading → `completeIfAllStudentsGraded`.
  - Repositories get the open transaction via `prismaTransaction(tx)` or `PrismaUnitOfWork.client()`.
  - `PrismaModule` provides `UnitOfWork`.
- dependency-cruiser 18.7.0 (installed with npm 10) with `.dependency-cruiser.cjs`. All rules are severity `warn`; specs are excluded.
  - `domain-no-framework`: `domain/` imports only its own `domain/` and `shared/domain/`.
  - `layers-inward`:
    - `application/` imports neither `infrastructure/`/`presentation/` nor Prisma
    - `infrastructure/` doesn't import `presentation/`
    - `presentation/` doesn't import `infrastructure/`
  - `context-via-application`:
    - other contexts only through their `application/index.ts`
    - the legacy `src/modules/` count as other contexts in both directions
    - `shared/` depends on no context, except the planned `shared/presentation/security/` re-export of identity-access's guards
  - `no-circular`: `identity-access` depends on no other context or legacy module. Cycles between contexts are checked at context level by `scripts/check-context-cycles.cjs` on depcruise's JSON output (`npm run depcruise:contexts`). dependency-cruiser's `circular` only sees cycles between files, and type-only imports don't count.
- CI (backend job): `npx depcruise src --config .dependency-cruiser.cjs` and `npm run depcruise:contexts`, both in warn mode until M34.

**Verified:**
- **Baseline:** 0 violations of the four rules (166 modules, 580 dependencies), 0 cycles between contexts. Nothing has moved into the contexts yet.
- **Extra baseline outside the rules:** 3 file cycles in the legacy modules: chat-messages ↔ websocket ↔ notifications and chat-rooms ↔ websocket. They become relevant in M21/M23.
- **Each rule really fires.** I used temporary files, deleted afterwards. Reported:
  - a domain importing `@nestjs/common`
  - `shared/domain` importing infrastructure
  - `application` importing infrastructure, `application` importing `@prisma/client`, and infrastructure ↔ presentation
  - a context importing another context's internals, a context → legacy module, a legacy module → context internals, and `shared` → context internals
  - identity-access depending on another context, and a context cycle through the two `index.ts` files

  Not reported, correctly: a type-only cycle inside a domain, and the context-root module file importing infrastructure.
- `UnitOfWork` tests: result, failure propagation, a nested `run()` sharing one transaction, and `client()` inside and outside a transaction.
- Backend 363 unit and 54 E2E tests, frontend 160; tsc, lint (0 errors, 481 warnings), knip and build pass. `act`: all three jobs succeeded, with both new steps green.
- `code-review` (high), 10 findings, all fixed:
  1. `Transaction` lived in `application`, so domain ports couldn't use it.
  2. The unit of work wasn't re-entrant.
  3. Cycles between contexts went unnoticed through different files.
  4. Legacy modules weren't checked.
  5. `shared` → context internals wasn't checked.
  6. Type-only and in-context file cycles counted.
  7. There was no place for the module files.
  8. `application` → Prisma wasn't checked.
  9. The baseline wasn't recorded yet.
  10. The stale T85 path in THESIS_ALIGNMENT.md, and the name of the rollback test.

**Learned (for later milestones):**
- The migration milestones (M11–M24) move code into the contexts. The `context-via-application` warnings for legacy-module edges show the remaining coupling and should fall to 0 by M24.

**Failed / open:** none.

## 2026-11-07 – M11: Migrate `identity-access`

**Decision asked first:** G1 (GOALS.md, 2026-11-07). Services in `application/` work through repository ports; Prisma repositories in `infrastructure/` make exactly the previous queries. "M2 tests unchanged" means every test case, mock and assertion stays the same; only the line that constructs the service under test and the import paths change.

**Done:**
- `auth`, `users`, `roles` and `permissions` now live only in `src/contexts/identity-access` (moved with `git mv`, 214 imports rewritten):
  - `domain/`: `role-permissions.ts` (`RoleName`, `STAFF_ROLES`, `PRIVILEGED_ROLES`, `isRoleIn`, the role permissions) and `permission-flag.ts`. Pure TypeScript.
  - `application/`:
    - `AuthService`, `UsersService`, `PermissionsService`, `RolesService` and `RolePermissionsService`
    - the ports `UserRepository`, `PermissionRepository`, `RoleRepository` and `RolePermissionRepository`, whose row types are Prisma's generated types, imported type-only
    - input types instead of the presentation DTOs, `BCRYPT_COST`, and `AuthenticatedUser`
    - `index.ts` as the public entry point
  - `infrastructure/`: the Prisma repositories, the Passport strategies (jwt, local, google) and `jwt.config.ts`. `JwtStrategy` now reads the user through `UserRepository`.
  - `presentation/`: the four controllers, the DTOs, and `security/` (guards, decorators, `AuthenticatedRequest`, `index.ts`). Re-exported through `shared/presentation/security/` (T97 order documented there).
  - `identity-access.module.ts` (global) at the context root replaces `AuthModule`, `UsersModule`, `RolesModule` and `PermissionsModule`.
- The legacy modules import identity-access only through `contexts/identity-access/application` (permissions, role names, flags) or `shared/presentation/security` (guards, decorators). 114 imports were rewritten, and 35 duplicate import groups merged.
- The WebSocket module uses the globally exported, configured `JwtModule` instead of its own.
- dependency-cruiser: `application/` may import Prisma only `import type` (generated row types in the ports, G1); a runtime import still warns.
- Lint per context (decision Q13): identity-access has 0 `no-unsafe-*` findings, specs included. The rules are `error` for `src/contexts/identity-access/**`. The typing came from the typed JWT payload, Google user, requests and repository results; the specs got type-only casts (`as never`, `mock.calls as unknown[][]`) with the test cases unchanged.
- Fixed while moving (code review, security):
  - Register, `POST /users`, `PATCH /users/:id` and `DELETE /users/:id` returned the bcrypt `password_hash`; they now return the user without it (`withoutPasswordHash`).
  - `PATCH /users/:id` accepted `password` and then failed with a Prisma 500; `UpdateUserDto` omits the password, so the request now gets 400.

**Verified:**
- Done-when:
  - `src/modules/{auth,users,roles,permissions}` and `src/config/` are gone.
  - **0 dependency-cruiser violations** (176 modules) and 0 cycles between contexts. The legacy modules' edges into identity-access are clean too.
  - The moved M2 specs, compared with `HEAD` without imports, differ only in the construction line (`new PrismaUserRepository(prisma)`/`new PrismaPermissionRepository(prisma)`) or one provider line, plus the type-only lint casts. 6 spec files are otherwise identical. `tasks.service.characterization.spec.ts` (M1) changed the same way.
  - `GET /api-json` is **byte-identical** to `HEAD`. I generated it in a git worktree of `HEAD` and in the working tree.
- Backend 363 unit and 55 E2E tests (new: no `password_hash` in register/update responses, 400 for a password in PATCH), frontend 160; tsc, lint (0 errors, 431 warnings; ratchet 481 → 431), knip and build pass. `act`: all three jobs succeeded.
- `code-review` (high) confirmed the query extraction is faithful (where/include/select/data, `|| null`, `orderBy`) and the DI holds. 10 findings:
  - fixed:
    - the password hash in responses (2)
    - `password` in `PATCH` (3)
    - Lint per context, which I had missed (5)
    - deep imports from the seeds and E2E tests into identity-access internals: `BCRYPT_COST` and `getPermissionsForRole` are now in the index, and `guard-order` uses the shared security export (7)
    - `JwtStrategy` querying Prisma directly (8, partly)
    - `RoleGrant` duplicating `UserRoleWithRolePermissions` (9, partly)
    - the leftovers (10): stale paths in comments, GOALS.md, THESIS_ALIGNMENT.md, UNUSED_CODE.md and `documents/AUTOMATISCHE-PERMISSIONS.md`; `.gitkeep` files in populated folders; the `PermissionFlag` re-export; unused imports
  - planned in later milestones:
    - (1) Removing a role leaves the permissions it granted: an existing bug, now in M35 step 1b.
    - (4/8) Google sign-in collides with local accounts and duplicates the user provisioning: an existing bug, now in M13 step 5.
  - documented:
    - (6) dependency-cruiser doesn't see DI dependencies: the global module exports `JwtModule`, `PassportModule` and `PermissionsService` to everyone.
    - The specs are excluded from depcruise; `tasks.service.characterization.spec.ts` builds the real `PrismaPermissionRepository`, so it imports infrastructure.
  - accepted: `RolePermissionRepository` and `UserRepository` share two queries.

**Learned (for later milestones):**
- Moving a context needs a construction-line change in specs of other contexts that build its services with Prisma mocks (here the M1 task spec). G1 covers that.
- A `@Global` context module is convenient for the guards but invisible to dependency-cruiser. The later contexts should export narrow providers and import identity-access explicitly where they need more than the guards.

**Failed / open:** none.

## 2026-11-07 – M12: Access and refresh tokens, logout

**Done:**
- Backend (identity-access):
  - Access tokens last 15 minutes (`jwt.config.ts` default, `.env.example`, `.env.test`; T51).
  - The new table `refresh_tokens` (decision Q8b, migration `20261107140000_add_refresh_tokens`) holds only the SHA-256 hash of a random 32-byte token. Both seeds clear it.
  - `SessionService` (port `RefreshTokenRepository`, Prisma repository on the unit of work):
    - `start` opens a session that is valid 7 days.
    - `refresh` rotates the token in one unit of work. A conditional revoke stops two parallel refreshes with the same token. The new row keeps the login's expiry, so a session ends 7 days after login however often it rotates.
    - `logout` revokes only the current session, in one query.
    - `deleteExpired` runs nightly via `SessionCleanupJob`, so the table stays bounded.
  - Login returns `refreshToken` next to `token`. `POST /auth/refresh` returns 201 with the rotated pair; an unknown, revoked, rotated or expired token gets 401, and a missing one gets 400. `POST /auth/logout` returns 204 (T123).
  - The Google sign-in callback passes `#token=…&refreshToken=…` (decision Q9). The reset-password callback passes only the access token and starts no session.
- Frontend:
  - `httpClient`: on a 401, one refresh is shared by all parallel requests, then the request is retried. The user is logged out only when the server refuses the refresh token. A network error, 429 or 500 keeps the session.
    - If another tab rotated the shared token first, the client takes that tab's tokens.
    - A request that went out with a token already replaced is retried without a new refresh.
    - Login, register, refresh, logout and `set-new-password` never trigger a refresh.
  - `authStore` stores the refresh token, and logout sends it. A login or callback without a refresh token removes an old one, and so does the reset page.
  - WebSocket (`socketAuth.js`):
    - Both sockets read the current token at every (re)connect.
    - After the gateway drops a connection with an expired token, the client refreshes and reconnects, at most once a minute.
  - `StatusDistributionChart` uses `apiClient` instead of a raw `fetch` with a copied token.

**Verified:**
- Done when:
  - `test/session.e2e-spec.ts` covers:
    - login, then refresh, then logout
    - an expired access token gets 401
    - a rotated or revoked refresh token gets 401
    - logout on one session leaves another session working
    - rotation keeps the expiry
    - no `Set-Cookie` on refresh or logout (T13)
  - Vitest covers the frontend refresh (`httpClient.spec.js`, 11 tests), the WebSocket reconnect, the store, the callback and the reset view.
- Backend: 372 unit and 60 E2E tests. Frontend: 182 tests. tsc, lint (0 errors, 431 warnings), knip, dependency-cruiser (0 violations, 0 context cycles) and the build pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings:
  - fixed:
    - logging out across tabs (1)
    - sockets dying after the server dropped an expired token (2)
    - the chart's raw `fetch` (3)
    - logging out on a network error or 429 (4)
    - the sliding 7-day expiry (5)
    - a stale refresh token next to a reset token (8)
    - logout's double query and the unbounded table (9)
    - a second rotation for a stale request (10)
  - planned: (7) revoking all sessions on a password change goes into M13 as step 6, with a Done-when check, because M13 owns the password flows.
  - open: (6) reuse detection, meaning revoking the whole session chain when a rotated token comes back. Two tabs of one browser reuse a token legitimately (finding 1), so this needs coordination between tabs first, for example `navigator.locks`. Not in the thesis.

**Learned (for later milestones):**
- `vitest.setup.js` mocks `@/stores/authStore` globally. A spec of the real store loads it with `vi.importActual`.
- `act -j backend-e2e` needs port 5433. Stop the local test DB first (`docker compose -f docker-compose.test.yml down`) and start it again for local E2E runs.
- The WebSocket gateway checks the JWT only at the handshake. An open connection stays alive after the token expires; only a reconnect needs a fresh token.

**Failed / open:** reuse detection (finding 6, see above).

## 2026-11-07 – M13: Password reset by e-mail

**Done:**
- `POST /auth/forgot-password` (T52) always answers 204, even for an unknown address. It is throttled to 3 requests per minute.
  - The mail is sent after the answer, so neither the answer nor its timing reveals whether the address exists.
  - At most one reset mail per account every 5 minutes (recorded in `email_logs`), so the public endpoint can't flood an inbox.
- The link `FRONTEND_URL/reset-password#token=…` (in the fragment, decision Q9) carries a 30-minute JWT with purpose `reset` (decision Q8a). Its key is `JWT_SECRET:reset:<password hash>`, so the link stops working once the password changes. The `:reset:` part means a reset token never passes as an access token, even for Google-only accounts without a password hash.
- `set-new-password` uses `PasswordChangeGuard`. A reset token is recognized by its purpose and checked by `PasswordResetService`; any other bearer token goes through the normal JWT check, so the Google reset path stays.
  - The password follows the registration rules (7–32 characters, `NewPasswordDto`), and the reset view checks the same rules.
  - The change revokes all of the user's refresh tokens (step 6, from the M12 review) in the same unit of work as the password update. `PrismaUserRepository.updatePasswordHash` joins the unit of work; the dependency is optional, so the M2 specs build the repository unchanged.
- Google sign-in (step 5): `GoogleStrategy` only maps the profile; `AuthService.signInWithGoogle` does the rest.
  - It looks the account up by `google_id`, then by a verified e-mail. A matched account is linked only if it has no Google id yet; otherwise 409.
  - A new user gets the same default role as registration (`assignDefaultRole`).
  - An e-mail or username that another account uses ends in 409 instead of a unique-constraint 500. The strategy no longer logs profile data.
- Dependency rules: identity-access may not import the legacy e-mail module, so it defines the port `PasswordResetMailer`. `modules/email` implements it on the existing `EmailService` (`EmailPasswordResetMailer`, bound by the global `PasswordResetMailModule`) until M23.
- Mail transport (`mail-transport.ts`, injected as `MAIL_TRANSPORT`): SMTP in production, Ethereal in development. In tests, a file outbox in `MAIL_OUTBOX_DIR` (gitignored), so no E2E run sends mail over the network.
- `frontendUrl()` in `shared/presentation` replaces two copies of the `FRONTEND_URL` default.

**Verified:**
- Done when:
  - `test/password-reset.e2e-spec.ts` covers:
    - an unknown address gets 204 and no mail
    - the address is matched case-insensitively
    - the token is read from the outbox and sets a new password, and the login works with it
    - the reset token gets 401 as an access token
    - a 6- or 33-character password gets 400
    - the same link again gets 401
    - a refresh token from before the change gets 401
    - an expired link gets 401
    - the Google reset path (an access token) still works
  - Frontend against the real backend: a temporary Cypress spec, kept outside the repo, ran with the backend on the test DB (port 3001) and Vite. It requested the link on `/forgot-password`, opened the link from the outbox, set a password on `/reset-password` and signed in with it. Passed, both before and after the review fixes.
- Backend: 406 unit and 63 E2E tests. Frontend: 184 tests. tsc, lint (0 errors, 431 warnings), knip, dependency-cruiser (0 violations, 0 context cycles) and the build pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 9 findings:
  - fixed:
    - a Google-only account's reset token passed as an access token (1, critical)
    - Google collisions ended in 500 (2)
    - the password change and the revoke weren't atomic (3)
    - `linkGoogleId` overwrote another Google id (4)
    - weaker password rules than registration (5)
    - a failed mail was never logged (6)
    - inbox flooding (7)
    - the duplicated `FRONTEND_URL` default (9, partly)
  - accepted:
    - (8) Access tokens issued before a password change stay valid until they expire (at most 15 minutes, T51). Rejecting them would need a `password_changed_at` column, which is an unapproved schema change.
    - A refresh that runs in the same milliseconds as the revoke can still insert one rotated row.
    - (9, rest) `requestReset` loads the roles with the user, because `findByEmailWithRoles` is the case-insensitive lookup.

**Learned (for later milestones):**
- Global binding modules (`PasswordResetMailModule`) are the way for a context to use a legacy module before that module is migrated. Remove this one in M23.
- `NODE_ENV=test` now switches the e-mail transport. E2E files that trigger mail can read `MAIL_OUTBOX_DIR`.

**Failed / open:** none beyond the accepted points above.

## 2026-11-07 – M14: Ghost-user anonymization on account deletion

**Decision asked first:** H1 (GOALS.md, 2026-11-07). M14 names only `chat_messages`, the task authorship, `comments` and `task_grade`; about a dozen other tables reference `users` with `NoAction`. The user chose the recommended option on all four questions: shared content to the ghost, personal rows deleted, task uploads kept, own notes deleted, and teachers blocked while still assigned.

**Done:**
- The ghost user 0 "Gelöschter Nutzer" (`domain/ghost-user.ts`, thesis 03_…:295-299):
  - It has no password and no Google id.
  - `seed.ts` and `test-seed.ts` create it with an explicit id, which doesn't move the sequence, so all other seed ids stay the same.
  - The data migration `20261107160000_add_ghost_user` adds it to existing databases (`ON CONFLICT DO NOTHING`).
  - It can't be changed, deleted, given roles or permissions (400), linked to Google (409) or sent a reset mail. It is left out of the chat user list and the admin user list.
- `DELETE /users/:id` anonymizes (T10, decision H1). It runs in one unit of work:
  - it locks the `users` and `teachers` rows (`FOR UPDATE`), so concurrent assignments and a second delete wait
  - 404 for an unknown user
  - 409 while the teacher is still head teacher, class teacher or has lesson slots
  - 400 for the own account or the last Superuser/Admin
  - then `anonymizeAndDelete`
- `anonymizeAndDelete`, following decision H1:
  - Moved to user 0: `chat_messages`, `tasks.created_by`, `comments`, `task_comments`, `chat_rooms.created_by`, `task_activity_log`, `task_templates.created_by`, `documents.graded_by`, and `documents.added_by` for documents attached to a task.
  - Set to NULL: `tasks.assigned_to` and `teachers.supervisor_id`.
  - Deleted: `user_roles`, `chat_room_users`, `document_shares`, `notifications`, the uploads that belong to no task, the user's own notes with their shares and document links, the `notes_users` entries, and the `students`/`teachers` row.
  - Cascades: `user_permissions`, `email_*`, `refresh_tokens` and `task_members`.
  - In other members' chat notifications, the name prefix `💬 Vorname Nachname:` becomes `💬 Gelöschter Nutzer:`.
- The plain `UserRepository.delete` is removed, so nothing can skip the anonymization.

**Verified:**
- Done when:
  - The M2 `// THESIS: T10` test is flipped: it now checks the reassignment to user 0 and the delete of the user row.
  - `test/account-deletion.e2e-spec.ts` creates its own user, with a class-chat membership and message, a task, a comment, a task upload, a private note with a file, and notifications. It deletes the user as admin and shows:
    - the class chat intact, with the message under "Gelöschter Nutzer" and the seed messages in order
    - the task and the comment under user 0
    - the personal rows gone, the private file gone, the task upload under user 0
    - the name replaced in Anna's notification
    - no login for the deleted account
  - The same file checks 400 for deleting or patching the ghost, 400 for deleting the own account, 409 for the class teacher Peter and 404 for an unknown user.
  - The FK check: the review compared all 25 `REFERENCES "users"` constraints in the migrations with `anonymizeAndDelete`. Each one is handled.
- Backend: 434 unit and 69 E2E tests. Frontend: 184 tests. tsc, lint (0 errors, 431 warnings), knip, dependency-cruiser (0 violations, 0 context cycles) and the build pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings:
  - fixed:
    - the last Superuser/Admin or the own account could be deleted (1)
    - the ghost could be changed, and Google could link to it (2)
    - the name stayed in other users' notifications (3)
    - private files survived under the ghost (4)
    - checks outside the transaction, and races (5, 6)
    - the migration conflict target (8)
    - the dead `delete` (9)
    - the notes relation filter (10, partly)
  - planned:
    - (7) The ghost as task member, mention target or notification recipient: M16 step 6.
    - (10) identity-access writes other contexts' tables directly (rule 4): an account-deletion port in M15 step 6, then M19, M20 and M22 for their tables.
  - accepted: two admins deleting the only two Admins at the same moment can both pass the last-holder check, because the role rows aren't locked.

**Learned (for later milestones):**
- Before M14, deleting any user with a role failed on `user_roles` (`NoAction`), so `DELETE /users/:id` never worked for real accounts.
- A milestone that adds a table with a user FK (M25 `user_settings`, M27 `user_avatars`, M32 `user_two_factor`) has to extend `anonymizeAndDelete` and the E2E test. GOALS.md says this in T10's "Why"; with `NoAction` the delete fails otherwise.
- The data migration and the seeds both create user 0: the migration for existing databases, the seed after its `TRUNCATE`.

**Failed / open:** see "accepted" above.

## 2026-11-08 – M15: Migrate `task-management`

**Done:**
- The task code lives only in `src/contexts/task-management`. The modules `tasks`, `task-members`, `task-templates`, `task-comments` and `task-activity-log` are gone.
  - `domain/`:
    - `completion-rule.ts` (`evaluateCondition`, `ruleContainsTask`)
    - `task.ts`: the aggregate's rules: `wouldCreateCycle` (was `validateNoCircularReference`), `isOwnParent`, `mayChangeLockedTask`, `mayEdit`, `mayLock`, `buildTree`, `LOCK_DURATION_MS`
  - `application/`:
    - ports for tasks, activity log, members, templates, comments, grading remarks, `TaskRealtime` and `MentionMailer`, with Prisma's types type-only
    - `TaskService` (create, read, update, delete, subtasks, lists), `TaskLockingService`, `TaskCompletionService`, `TaskActivityLogService` (with the audit log), `TaskMembersService`, `TaskTemplatesService`, `CommentsService` (@mention mail, T09) and `GradeRemarksService`
  - `infrastructure/`: Prisma repositories that make the previous queries (decision G1), all through `PrismaUnitOfWork.client()`, and `TaskAccountDeletion`
  - `presentation/`: the one `TaskController` (decision Q6) and the DTOs
- One unit of work per task use case (T32, L1): create, update, delete and deadline-unlock write the task and its activity-log entry together.
  - Completing a task reads its descendant IDs before the transaction, so the transaction stays short.
  - Realtime events for parents that changed are sent only after the commit.
- Delete (decision Q8g): in the transaction, write `Task deleted: "<title>"`, set `task_id = null` on all of the task's log rows, then delete the task with its comments, grading remarks and document links (Q16 step 4.4). Chat rooms stay, without the task.
- Comments and grading remarks (decision Q16):
  - Migration `20261107180000_task_comments_to_task_grade`: renames the table with its PK, FKs and sequence, copies the rows into `comments` (`user_id` → `created_by`, `text` → `content`, timestamps kept) and empties `task_grade`. The seeds write discussion comments into `comments` and grading remarks into `task_grade`.
  - Only the author edits or deletes a comment (403).
  - Grading remarks: writing needs `@Roles(...STAFF_ROLES)` plus `edit_grades`, the same check as `PATCH /documents/:id/grade`. Reading is for task members and staff.
- Admin audit log `GET /tasks/activity` (T33, UC-32, decision A2): `@Roles(...PRIVILEGED_ROLES)` plus `manage_system`. Paginated, filterable by `user_id`, `action` and `from`/`to` (a date alone means the whole day), and includes the entries of deleted tasks.
- M14 step 6 (rule 4): identity-access has an `AccountDeletionRegistry`. task-management registers `TaskAccountDeletion`, which moves its tables to the ghost user and ends assignments in the deletion's unit of work; identity-access no longer writes the task tables.
- Legacy bindings: `EmailPortsModule` (renamed from `PasswordResetMailModule`, now also `MentionMailer`) and `WebsocketPortsModule` (`TaskRealtime`) are global until M20 and M23. `EmailCronService` no longer injects `TasksService`, which it never used.
- Fixed while moving:
  - `BUG (M15)`: `changeTaskParent` checks the own parent first, the same way as `update()`.
  - `/api/api/tasks/…/members` is now `/api/tasks/:id/members` (T130).
  - The activity log's include selected non-existent columns.
  - A non-numeric `:id` gets 400 instead of 500.
  - A member-list denial gets 403 instead of 400.
  - `check-permission` takes 2 queries instead of 6.
- Frontend: `api/taskMembers.js` (without the doubled `/api`) and `api/taskTemplates.js` (`/tasks/templates`).
- Lint: task-management has 0 `no-unsafe-*` findings and the rules are `error` there (decision Q13). The backend ratchet goes from 431 to 285 warnings.

**Route table** (`GET /api-json`, all under `/api`):

| Method | Path | Guard / permission |
|---|---|---|
| POST | /tasks | create_tasks W |
| GET | /tasks | view_dashboard |
| GET | /tasks/activity | Admin/Superuser, manage_system R |
| POST | /tasks/templates | create_tasks W |
| GET | /tasks/templates | view_dashboard |
| GET | /tasks/templates/{templateId} | view_dashboard |
| PATCH | /tasks/templates/{templateId} | create_tasks W |
| DELETE | /tasks/templates/{templateId} | create_tasks W |
| GET | /tasks/{id} | view_dashboard |
| PATCH | /tasks/{id} | edit_tasks W |
| DELETE | /tasks/{id} | edit_tasks or delete_tasks (others' tasks: delete_tasks, service) |
| GET | /tasks/{id}/tree | view_dashboard |
| PATCH | /tasks/{id}/deadline-unlock | edit_tasks W (staff or creator, service) |
| POST, GET | /tasks/{id}/subtasks | create_tasks W / view_dashboard |
| GET | /tasks/{id}/documents | view_dashboard |
| GET | /tasks/{id}/activity | view_dashboard |
| POST | /tasks/{id}/lock, /tasks/{id}/unlock | edit_tasks W (creator, service) |
| GET | /tasks/{id}/can-edit | view_dashboard |
| GET, POST | /tasks/{id}/comments | view_dashboard |
| PATCH, DELETE | /tasks/{id}/comments/{commentId} | view_dashboard (author, service) |
| GET | /tasks/{id}/grade-remarks | view_grades (member or staff, service) |
| POST | /tasks/{id}/grade-remarks | Teacher/Admin/Superuser, edit_grades W |
| POST, GET | /tasks/{id}/members | edit_tasks W / view_dashboard (member or READ, service) |
| GET | /tasks/{id}/members/check-permission | view_dashboard |
| DELETE | /tasks/{id}/members/{userId} | edit_tasks W |

Removed: `/api/task-activity` (3 routes), `/api/task-comments` (5), `/api/task-templates` (5) and `/api/api/tasks/{taskId}/members` (4).

**Verified:**
- Done when:
  - 0 dependency-cruiser violations (209 modules) and 0 context cycles. Specs and `*.fixtures.ts` are excluded, like specs before.
  - The rollback: `test/task-transaction.e2e-spec.ts` replaces the activity-log repository with one that fails. `POST /tasks` and `PATCH /tasks/:id` answer 500, and neither the task nor the change is in the database. The unit tests show the same inside `$transaction`.
  - The three `// THESIS: T32` tests are flipped (create, update, delete). `test/task-management.e2e-spec.ts` shows the created, updated and deleted entries of a deleted task, all with `task_id` null, in the database and in the audit log.
  - The M1 task spec is split along the services into four files plus `task.characterization.fixtures.ts`. It has the same 54 test names (compared), and all 54 pass. Besides the construction lines, only the T32, `BUG (M15)` and Q16 comments tests changed.
  - The 9 @mention tests pass against `CommentsService` on `comments`.
  - After the reset with seed, `GET /tasks/1/comments` returns the former discussion comments, and a student gets 403 writing a grading remark.
  - The migration on a throwaway database: two `task_comments` rows arrive in `comments` with their dates, `task_grade` is empty and `task_comments` is gone. `prisma migrate diff` shows no drift.
  - `GET /api-json`: compared with `HEAD` (worktree, `ts-node --transpile-only`), 128 → 126 routes. The difference is exactly the removed and added routes above.
  - No task-management file is over 500 lines; the members spec was split at 405 lines. Files over 500 elsewhere belong to M19 (`documents`).
- Backend: 447 unit and 81 E2E tests. Frontend: 184 tests. tsc, lint (0 errors, 285 warnings), knip and build pass. `act`: all three jobs succeeded.
- `code-review` (high) confirmed the moved queries, the migration and the route order. 10 findings:
  - fixed:
    - realtime events sent before the commit (2)
    - recursive reads inside the transaction (3)
    - `to` as a date dropped the day (5)
    - dead `CommentsService.findForTask` and the `task_id: null` union (6, partly)
    - the member-list check in the controller with 400 (7)
    - repeated reads (8)
  - planned: (1) `GET /tasks/:id` and its sub-resources check only `view_dashboard`, which was already so before M15. This is M17 step 5, using the visible set from step 4, with a Done-when check.
  - documented:
    - (4) A task delete deletes its comments, as Q16 step 4.4 says.
    - (6, rest) `lockOverdueTask`, `changeTaskParent` and `extractPermissions` have no caller, but M1 and member tests pin them. The overdue cron locks tasks itself until M23.
    - (9) Without a registered participant, the account deletion fails on the task FK and loses nothing.
    - (10) The template include stays broken until M18 on purpose: decision E1 says a working template API must come with the privacy fix.

**Learned (for later milestones):**
- Global binding modules are the bridge from a context to a legacy module (`EmailPortsModule`, `WebsocketPortsModule`). M20 and M23 remove them.
- An account deletion now runs through the registry. M19, M20 and M22 register their own participants (GOALS.md M15 step 6).
- With the unit of work, a failing statement aborts the Postgres transaction, so best-effort `try/catch` inside a use case no longer works. Side effects such as mail go after the commit or out of the use case.

**Failed / open:** see "planned" and "documented" above.

## 2026-11-08 – M16: Task rules and notifications per thesis

**Done:**
- T100: `COMPLETED` only at 100 %.
  - Backend: `isCompletionWithoutFullProgress` in the Task aggregate. Create and update answer 400 when a task would be `COMPLETED` below 100 %, including a lower progress on a task that stays completed. Auto-completion, the cascade to subtasks and the completion from grades set 100 % themselves.
  - Frontend: in `TaskCard`, the checkbox (also on subtasks) and the "Fertig" option stay disabled until 100 %, with a hint; a completed task can be reopened.
  - `taskStore.changeStatus` no longer sets 100 % itself, and rolls the status back when the server refuses.
  - `useTaskValidation`: 100 % on an open task is now a hint, not an error. Otherwise the form couldn't save 100 % and the checkbox could never be used.
- T107: the realtime event of an auto-completed or reopened parent goes to its creator, assignee and members (`involvedUsersOf`, without the ghost user), after the commit. The store merges the event into the cached task instead of replacing it, because the event carries no relations.
- T44/T72: `TaskNotificationsService` notifies through the notifications context's new port `Notifier` (`contexts/notifications/application`, its first file; bound to the legacy `NotificationsService` by the global `NotificationPortsModule` until M23).
  - `task_assigned`: a new assignee, on create and on update.
  - `task_member_added` and `task_member_removed`: the user concerned.
  - `task_status_changed`: everyone involved, on an update and for auto-completed parents.
  - The actor and the ghost user get none. All are sent after the commit, in parallel, and a failed one is logged.
- T41, UC-10, decision Q2: creating a subtask (`POST /tasks` with `parent_task_id`, and `POST /tasks/:id/subtasks`) and moving a task under another (`PATCH` with `parent_task_id`) require being the creator, assignee or a member of the root task (`findRootId`); otherwise 403.
  - A new top-level task stays open to `create_tasks`.
  - In `TaskForm`, the subtask builder shows only to the root task's people, and for a new task to everyone. Before, it was teachers and creators only.
- Step 6, the ghost user 0:
  - it can't be added as a member or set as assignee (400);
  - an @mention of it sends no mail;
  - `NotificationsService.create` creates nothing for user 0, whoever asks (for example the grading of a ghost-owned document).

**Verified:**
- Done when:
  - The M1 `// THESIS: T100` (400, no update) and `// THESIS: T107` (creator, assignee and members) tests are flipped.
  - `task-notifications.service.spec.ts` covers each notification type, the actor and ghost exclusions, failures and the parallel sends. `task.service.spec.ts` covers the notifications after the commit, an auto-completed parent's status change and no notification without a change.
  - The checkbox has `TaskCard.spec.js` (blocked below 100 %, allowed at 100 %, reopenable).
  - `test/task-rules.e2e-spec.ts`:
    - Laura, an outsider, gets 403 creating a subtask of task 1, both through `POST /tasks` and through `/subtasks`; Felix, a member, gets 201.
    - `COMPLETED` at 0 % gets 400, and at 100 % gets 200.
    - `task_member_added` is stored, and a status change is stored for Felix and Laura but not for the actor Anna.
  - The risk check: the seeds write tasks directly, no E2E file creates subtasks through the API, and the frontend's subtask flow (`TaskForm`) follows the rule.
- Two M1 fixtures got a creator so that their user is in the project (T41). The test cases are unchanged.
- Backend: 474 unit and 85 E2E tests. Frontend: 21 files. tsc, lint (0 errors), knip and dependency-cruiser (0 violations) pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings, all fixed except one part of (4):
  - (1) the T41 bypass by re-parenting through `PATCH`
  - (2) the form validation that made the checkbox unusable
  - (3) the realtime row replacing the cached task
  - (4) no notification for auto-completed parents
  - (5) no rollback in `changeStatus`
  - (6) the builder checking the task instead of its root, and new projects
  - (7) the ghost as assignee
  - (8) sequential sends
  - (9) the duplicated recipient rule
  - (10) the root walk on `findParentLink`, and the constant placed among the imports
  - From (4), subtasks completed by the cascade get no notification: one notification for the task the user completed is enough, and the subtasks change only because of it.

**Learned (for later milestones):**
- Realtime events carry the bare task row. Consumers merge, they don't replace.
- The `Notifier` port is the way into notifications for every context (GOALS.md rule 3 example). M19 (grading) and M20 (chat) switch their `NotificationsService.create` calls to it.

**Failed / open:** none.

## 2026-11-08 – M17: Unify completion from grades, keeping the read-time recalculation

**Done:**
- One implementation (problems 2 and 3, T119): `TaskCompletionService.completeIfAllStudentsGraded(tasks)` in task-management.
  - It takes a list of tasks and runs four queries for any number of them: members, participant profiles, graded submissions per task, then one `updateMany`.
  - Participants come from `involvedUsers`; a task counts as done when all of its student participants have a graded submission for it.
  - The read paths use it: `findOne` with one task, `findAll` with the page.
- Grading in `modules/documents` calls `completeAfterGrading(linkedTaskIds)`: one call for all linked tasks.
  - Since the review, a task completed this way counts as a status change: its parents' completion rules are re-checked, and the people involved get the realtime update and the `task_status_changed` notification.
  - `DocumentsService.completeTaskIfAllParticipantsGraded`, the 100-line copy, is gone.
  - task-management is `@Global` and exports `TaskCompletionService` through `application/index.ts`; a legacy module may not import a context's module file.
- Decision B3: `TaskRepository.findVisibleTaskIds` determines a student's visible set (created, assigned or member, plus all descendants) in one recursive query; `UNION` stops at a cycle.
  - `GET /tasks` filters, sorts, pages and counts within that set, with `task_id` as a tiebreaker so pages stay stable. Staff see all tasks.
  - The old merge of a page with all its descendants is gone.
- Step 5 (from M15), after the review: `TaskVisibilityGuard` on the `TaskController` checks every `/tasks/:id…` route, reads and writes alike. A task the requester can't see answers 404, like a missing one.
  - The check is one targeted query: `isVisibleTo`, from the task up through its ancestors, is the user creator, assignee or member anywhere on the way. Staff pass without a query.
  - This also closes `PATCH`, `DELETE`, deadline-unlock, lock/unlock, `can-edit`, `check-permission`, and the way a student could add themselves as a member of any task and so join its visible set (finding 2).
  - Grading remarks and the member list keep their own checks on top.
- Frontend: `fetchTasks` reads all pages, 100 per request. Before, the store got only the first 50 tasks.
- The thesis test "recalculates task status in findOne" (`08_…:84-90`) is in `task.service.spec.ts`. Its listing mocks only `findUnique`; with those mocks alone the task has no participants and is not completed, so the test also mocks the participant and the graded submission.

**Verified:**
- Done when:
  - Exactly one implementation exists: a search finds no other copy of the completion rule. The only other `graded_at: { not: null }` query is "my grades".
  - The thesis test passes.
  - A student gets 404 on `GET /tasks/1/comments` outside their visible set (`test/task-visibility.e2e-spec.ts`), also for `POST` comments, `GET /tasks/1`, `PATCH`, `DELETE`, adding a member, `check-permission` and `lock`.
  - `findAll` makes the same number of queries for `limit` 10 and 25 (Prisma mock call count).
  - 25 visible tasks with `limit=10` return 10, 10 and 5 tasks with `total` 25 and `totalPages` 3: with a Prisma mock, and in E2E with a new student who has 5 assigned projects of 4 subtasks each.
- Test changes:
  - The M1 and document tests for the completion keep their assertions. Their mock rows carry `task_id` or `task_documents`, as the batched queries read them, and they assert `updateMany` instead of `update`.
  - The three student `findAll` tests in M1 now describe the visible set (B3). The `BUG (B3)` test is flipped.
  - Three E2E tests expect 404 instead of 403 for users outside the task's visible set: `guard-order` deadline-unlock, `mitgliederverwaltung` adding a member, and `task-rules` `/subtasks`.
- Backend: 489 unit and 92 E2E tests. Frontend: 197 tests. tsc, lint (0 errors), knip and dependency-cruiser (0 violations, 0 context cycles) pass. No task-management file is over 500 lines (`task.service.spec.ts` was split). `act`: all three jobs succeeded.
- `code-review` (high) confirmed the batch attribution and the recursive query. 10 findings:
  - fixed:
    - (1, 2, 5, 8) visibility on every `:id` route, by the guard instead of optional user ids that left routes unchecked
    - (3) the frontend capped at 50 tasks
    - (4) unstable paging
    - (7) completion from grading without the parents' rules and notifications
    - (9) the whole visible set loaded for one check
    - (10) the per-task loop
  - documented:
    - (6) The read-time completion is a separate read and write. A task whose students are all graded becomes COMPLETED again on the next read, even right after a teacher reopened it. That is the thesis behavior (T119, the read-time recalculation stays). A filtered list (`?status=IN_PROGRESS`) can return a task this read just completed.

**Learned (for later milestones):**
- Per-task visibility belongs at the route boundary (a guard on `params.id`), not in optional service parameters, so it can't be forgotten.
- `created_by`, `assigned_to`, `parent_task_id` and `task_members.user_id` are read by the visibility queries on every request. M30 adds the FK indexes (decision Q8h).

**Failed / open:** none beyond the documented point above.

## 2026-11-08 – M18: Task list, priorities and templates per thesis

**Decision asked first:** H2 (GOALS.md, 2026-11-08). A template stores only `name` and `description`, as in the thesis schema (`prisma_schema.tex:286`); there is no schema change for defaults. "Save as template" stores the title as the name; applying a template fills title and description, and the user sets deadline, priority and assignee (07_…:225).

**Done:**
- T57: `useTaskFilters` gets a priority filter and a due-date filter (overdue = past and not completed, today, the next 7 days, no deadline), with two more selects in `TaskFilters.vue`. Callers without the new filters keep working.
- T58, decision Q15: migration `20261108090000_four_priorities`, data only.
  - Notes chose their priority by name (`resolvePriorityId`: low/medium/high), never through TaskForm's IDs, so all notes move by their old name, IDs 1–4 included: Niedrig → 1, Normal → 2, Wichtig/Sehr Wichtig/Hoch → 3, Sehr Hoch/Dringend/Kritisch/Blocker → 4.
  - Tasks keep IDs 1–4, which TaskForm has always shown as Niedrig/Mittel/Hoch/Dringend; IDs 5–10 move by name (→ 3 or → 4).
  - An unknown name falls back to Mittel.
  - Then IDs 1–4 are renamed, IDs 5–10 deleted, and the sequence set to 4.
  - Both seeds have the four priorities; three dev-seed tasks on ID 5 ("Sehr Wichtig") move to 3.
  - `config/priorities.js` is the one list in the frontend (TaskForm, SubtaskBuilder, TaskFilters, TaskCard).
- T110, decisions H2 and E1:
  - The template API works: the include had non-existent columns (fixed), and `CreateTaskTemplateDto` has `name` and `description` only.
  - Templates are private. `GET /tasks/templates` lists the requester's own; reading, changing or deleting someone else's gives 404; the author comes with name only, no e-mail. The ownership checks use a lean query.
  - Deleting a template keeps the tasks created from it and removes only their link. Before, a used template could never be deleted, and the answer was 404.
  - `POST /tasks` and `PATCH /tasks/:id` accept `template_id`, only of an own template.
  - `TaskForm`: "Als Vorlage speichern", and `applyTemplate` fills title and description and sets the link; "Keine Vorlage" drops the link again. `TemplateForm` and `TemplateCard` lost the `default_*` fields.
  - Account deletion: templates are deleted as personal rows (note on H1), because the ghost user couldn't use private templates.
- T59, decision Q8e: migration `20261108100000_add_tags` adds `tags(tag_id, name UNIQUE)` and `task_tags(task_id, tag_id)`, with cascades, so deleting a task removes its `task_tags` rows.
  - Tags are set through `tags` in the task create and update DTOs. Names are trimmed, single-spaced and lowercase, so "Mathe" and "mathe" are one tag, and at most 50 characters after normalizing (else 400).
  - The tags are written in the use case's unit of work, on update before the task is read, so the answer carries the new ones.
  - Tasks are read with `task_tags`. `TaskForm` has a tag field and sends tags only when the field changed. `TaskCard` shows `#tag` chips.

**Verified:**
- Done when:
  - `useTaskFilters.spec.js` covers priority, every due-date option (including the 7-day boundary), the combination and the old call.
  - `test/priorities.e2e-spec.ts` checks the four priorities after the seed.
  - `test/templates-and-tags.e2e-spec.ts` saves a task as a template and creates a task from it (`template_id` set). It also checks that another user neither lists nor reads the template nor can link it (404), that there is no e-mail in the response, and that deleting the template keeps the task.
  - The same file creates a task with the tags `Mathe`, ` Projekt ` and `mathe` and reads back `mathe` and `projekt`. A `PATCH` replaces them, and after deleting the task no `task_tags` row is left.
- The migration test the risk asks for: on a throwaway database with every earlier migration, the old 10 dev-seed priorities, and tasks and notes on every ID 1–10, the new migration gives:
  - tasks 1→1, 2→2, 3→3, 4→4, 5→3, 6→3, 7–10→4;
  - notes 1→1, 2→1, 3→2, 4→3, 5→3, 6→3, 7–10→4;
  - priorities `1=Niedrig, 2=Mittel, 3=Hoch, 4=Dringend`.
- Backend: 491 unit and 95 E2E tests. Frontend: 25 files. tsc, lint (0 errors), knip and dependency-cruiser (0 violations) pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings, all fixed except one part of (8):
  - (1) stale tags in the update answer
  - (2) `template_id` unchecked on update, and ID 0 on create
  - (3) notes changing meaning in the migration
  - (4) tags wiped by a save without `task_tags`
  - (5) a deselected template staying linked
  - (6) templates moved to the ghost user
  - (7) the ownership check loading all tasks
  - (8, partly) the length after lowercasing
  - (9) "7 days" covering 8 days
  - (10) five copies of the priority labels
  - From (8), unused tags are kept on purpose: they are a shared vocabulary for reuse, and deleting them while another transaction links them would race.

**Learned (for later milestones):**
- A decision's consequences can collide later (H1's ghost move with E1's privacy). The fix goes into the code, and the decision gets a note.
- Replace-semantics fields (tags) must be sent only when the user changed them, because some views open the form with an incomplete task object.

**Failed / open:** none beyond the kept tags above.

## 2026-11-08 – M19: Migrate documents-notes into its bounded context

**Done:**
- `src/contexts/documents-notes` replaces `src/modules/documents` (the 1,153-line `DocumentsService`) and `src/modules/notes`.
  - Domain: the access policy (T96) in `document-access.ts` (who may see, edit, delete, grade or release a document) and the upload rules in `file-type.ts` (allowed extensions, expected MIME types, safe file name). Both are pure.
  - Application: `DocumentAccessService` (requester, access check, task link check) and three use-case services: `DocumentQueriesService` (lists, one document, grades, download, a task's documents), `DocumentUploadsService` (upload, rename, delete) and `DocumentGradingService` (grade, allow resubmit). `toDocumentView` is the UI mapping. `NotesService` moved here.
  - Ports: `DocumentRepository`, `NoteRepository`, `DocumentStorage` and `FileInspector`. Infrastructure: Prisma repositories with the old queries (decision G1), `LocalDocumentStorage` (files under `UPLOAD_DIR`) and `MagicByteFileInspector`.
  - Presentation: the same routes, guards and DTOs. `AllowResubmitDto` is new: `new_deadline` must be an ISO date.
- Grading completes tasks through `TaskCompletionService` (M17). Releasing a resubmission goes through the new `TaskResubmissionService` in task-management. Grade plus completion, and the reopen, each run in one unit of work; the notifications follow the commit.
- Notifications go through the `Notifier` port. `NotifierAdapter` no longer sends `is_read: false`; the column defaults to false.
- Account deletion: `DocumentsAccountDeletion` takes over the notes and documents rows from `PrismaUserRepository.anonymizeAndDelete` (GOALS.md M15 step 6): own notes and private uploads are deleted, task uploads and grades move to the ghost user, shares with the user are deleted.
- Bugs fixed (each with a test):
  - BUG (M19): releasing a resubmission set `locked_until` to the new deadline, so the unlocked task looked "locked until" that date. It is now `null`.
  - Notes were read with a `tasks` include, a relation notes don't have, so every read with relations failed.
  - A note with a document link or a share couldn't be deleted (NoAction foreign keys). The links are deleted first, in one transaction.
  - Problem 10 (review M19): `GET /documents/by-task/:taskId` read `users?.[0]` from a single relation, so the uploader was always `null`.
  - Review M19: `GET` and `DELETE /documents/:id` with a non-numeric ID, and `allow-resubmit` with a deadline that isn't a date, answered 500; now 400.
- Lint: documents-notes has 0 `no-unsafe-*` findings and the rules are `error` there (decision Q13). The backend ratchet goes from 285 to 101 warnings.

**Verified:**
- Done when:
  - No documents-notes file is over 500 lines (the largest is the grading spec, 378). The M1 spec is split by service into `document-{queries,uploads,grading}.characterization.spec.ts` with `documents.fixtures.ts`; the old service spec into `document-uploads.service.spec.ts` and `document-grading.service.spec.ts`.
  - dependency-cruiser: 0 violations, 0 context cycles.
  - The M1 document tests pass. Beyond the construction lines and imports (G1), two M1 tests were flipped for the bugs above (`locked_until`, uploader). Two more changes: the `allowResubmit` calls lost the unused teacher-ID and role arguments (the role check has been the route guard's since M7), and asymmetric matchers got `as unknown` for the strict lint rules.
- `test/documents-notes.e2e-spec.ts`: notes list and read (200, 404 for another user), deleting a note with a document and a share, grading plus resubmission (`is_locked` false, `locked_until` null, new deadline, one notification, uploader in the task's documents), and 400 for non-numeric IDs and an invalid deadline.
- Backend: 493 unit and 99 E2E tests. Frontend unchanged. tsc, lint (0 errors, 101 warnings), knip, dependency-cruiser and build pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings. Fixed: (1) grading and resubmission not in one transaction, (3) a stale staged copy of the old spec, (4) the always-null uploader, (5) 500s for bad IDs and deadlines, (6) the E2E notification count not scoped to its task, (10) the redundant scope branch. Kept, with reasons:
  - (2) Reopening leaves a completed task COMPLETED. Completion follows from grades since M17 and the old grade stays, so the read-time recalculation would complete it again. What a resubmission does to the status is a product decision GOALS.md doesn't cover yet, so it stays open.
  - (7, 8) `DocumentAccessService` repeats role queries and reads identity tables through its own port instead of `PermissionsService`. G1 keeps the old queries in this migration; switching to identity-access's facade is a follow-up.
  - (9) `TaskResubmissionService` doesn't write an activity-log entry like `TaskLockingService.updateDeadlineAndUnlockIfNeeded`. The M1 test pins the exact update; the log entry belongs with (2).
  - (10, part) The in-memory student filter after the student-scoped query stays, because an M1 test pins it.

**Learned (for later milestones):**
- A mock object whose `$transaction` refers to the object itself is typed `any` and floods the strict lint rules. Set the implementation after the object is defined.
- `git mv` followed by deleting the target leaves a staged rename in the index. Check `git status` for `RD` before committing.

**Failed / open:** (2), (7, 8) and (9) above.

## 2026-11-08 – M20: Migrate communication, realtime transport in shared

**Done:**
- Shared realtime transport (`shared/infrastructure/realtime`, port in `shared/application/realtime.ts`):
  - `RealtimePublisher` (`toUser`, `toChannel`, `removeUserFromChannel`) is the port contexts publish through; `SocketIoRealtime` implements it on Socket.io.
  - `SocketIoRealtime` also accepts sockets: the token is checked through the `RealtimeAuthenticator` port (identity-access's `JwtRealtimeAuthenticator`: a valid access token and `view_dashboard`, T54, decision F1). The socket joins `user_<id>` and the channels the contexts register in `RealtimeChannelRegistry`.
  - Emit errors are logged and don't fail the use case that already committed (as the old gateway's try/catch did).
  - `REALTIME_GATEWAY_OPTIONS` (CORS: only `FRONTEND_URL`, T13) is shared by both gateways on the one Socket.io server.
- `src/contexts/communication` replaces `modules/chat-rooms`, `modules/chat-messages` and the chat part of `modules/websocket`:
  - Domain: the chat notification text and the channel name (`roomChannel`). Application: `ChatRoomsService`, `ChatMessagesService` and `ChatRealtime` (the user's room channels on connecting, unsubscribing a removed member) with `ChatRoomRepository` and `ChatMessageRepository`. Infrastructure: Prisma repositories with the old queries (G1) and `CommunicationAccountDeletion`.
  - Presentation: the same routes and DTOs, and `ChatGateway` with the same socket events (`join:room`, `invite:room`, `leave:room`, `delete:room`, `chat:send`, `chat:edit`, `chat:delete`, `chat:typing`).
  - Chat notifications go through the `Notifier` port; room joins and leaves run in a unit of work.
- Task events go through `RealtimeTaskEvents` (task-management infrastructure, `TaskRealtime` port), notifications through `RealtimePublisher`. The event names stay: `task:updated`, `task:locked`, `notification:new`, `chat:new`, `chat:edited`, `chat:deleted`, `room:new`, `room:user-joined`, `delete:room`, `chat:typing`.
- Account deletion (GOALS.md M15 step 6): chat messages and rooms move to the ghost user, memberships are deleted, now in `CommunicationAccountDeletion`. The rename in other members' chat notifications stays in identity-access until M23 migrates notifications.
- `modules/websocket` (gateway, `WebsocketPortsModule`, the unused `WsJwtGuard`), `modules/chat-rooms` and `modules/chat-messages` are deleted.
- Lint: communication and the realtime transport have 0 `no-unsafe-*` findings and the rules are `error` there (Q13). Ratchet 101 → 75 warnings.
- `socket.io-client` 4.8.3 (the frontend's version) is a backend dev dependency for the E2E test; the lock file was written with npm 10, as CI's `npm ci` needs.

**Verified:**
- Done when:
  - 0 dependency violations, 0 context cycles.
  - The M6 tests pass: the gateway handler tests in `chat.gateway.spec.ts` (only the construction changed); the connection tests (view_dashboard, room joins) and the unsubscribe test moved with their assertions to `socket-io-realtime.spec.ts`, wired with the real authenticator and `ChatRealtime`; the M2/M6 route and service specs with the new construction.
  - Cross-browser chat check (`08_…:216`): two separate Chromium processes with their own sessions (alehrerin and ffuchs), frontend dev server against a backend on the test database (`effsync_test`, port 3001), driven by a Playwright script instead of by hand. A → B and B → A arrived live, and a reload in each browser kept the history. Screenshots were checked.
- `test/realtime-chat.e2e-spec.ts` with two real Socket.io clients: both directions, `notification:new` for the chat message, the history over REST, and refusal of sockets without a token or with an invalid one.
- Backend: 500 unit and 101 E2E tests. tsc, lint (0 errors, 75 warnings), knip, dependency-cruiser and build pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings. Fixed: (1) a race in the refusal test, (2) a fixed wait in the E2E test (it now retries `join:room` until confirmed), (3) emit errors failing use cases, (4) the authenticator throwing on bad tokens and the catch-all hiding channel errors, (5) channel names spelled out in the gateway (now `roomChannel` and `userChannel`), (7) the connection loading whole rooms with members just for their IDs (`findActiveRoomIds`). Kept, with reasons:
  - (6) The active-membership query exists in both repositories (three forms). G1 keeps the old queries; one membership helper is M21's (already noted in M6).
  - (8) Chat notifications are sent one after another, as before. Batching belongs to M23 (notifications).
  - (9) Adding a member over REST doesn't put their open sockets into the room or send `room:new` (as before M20). That's chat behaviour for M21.
  - (10) The gateway options live in `shared/application`, because both the transport (infrastructure) and `ChatGateway` (presentation) need them and the layer rules allow neither to import the other.

**Learned (for later milestones):**
- `npm install` with the local npm 11 rewrites the lock file in a way CI's npm 10 `npm ci` rejects. Install with `npx npm@10`.
- The socket's token check runs after the client's `connect` event, so a `join:room` sent right away gets an `error` (also in the frontend). A Socket.io middleware for the check would remove that race (M21).
- A failed `docker compose up` (port taken by an `act` service container) leaves the test DB container without a port mapping; `down` and `up` again.

**Failed / open:** (6), (8), (9) and the connect race above.

## 2026-11-08 – M22: Migrate school-organization

**Done:**
- `src/contexts/school-organization` replaces `modules/classes`, `departments`, `subjects`, `rooms`, `schedules` and `lesson-slots` (features from `05_…:60`).
  - Domain: the schedule period rule (`isValidPeriod`). Application: the six services with their old class names; schedules and lesson slots on `ScheduleRepository` and `LessonSlotRepository` (the old queries, G1, typed records); input types in `school-inputs.ts`, so application doesn't import the DTOs. Classes, departments, subjects and rooms stay stubs until M36.
  - Presentation: the same controllers, routes, permissions and DTO class names; the controllers are registered in the order of the old modules.
  - The room create route passed the DTO class instead of the request body to the (stub) service; it passes the body now.
- Account deletion (GOALS.md M15 step 6): `AccountDeletionParticipant` gets an optional `assertDeletable`, which `UsersService.remove` runs after locking the user row and before anything is written. `SchoolAccountDeletion` (application, on the `SchoolProfileRepository` port) locks the teacher row, refuses a teacher who still heads or teaches a class or has lessons (409, same message, decision H1), and deletes the student and teacher profiles and clears supervisor references. `PrismaUserRepository` no longer touches `teachers`, `students`, `classes`, `classes_teachers` or `lesson_slots`.
- Lint: school-organization has 0 `no-unsafe-*` findings and the rules are `error` there (Q13). The ratchet stays at 75 (the remaining findings are the stubs' unused parameters, which M36 replaces).

**Verified:**
- Done when:
  - 0 dependency violations, 0 context cycles.
  - All existing tests pass: 508 unit and 101 E2E (including the 409 for a teacher who is still class teacher in `account-deletion.e2e-spec.ts`).
  - `GET /api-json`: captured from a build of HEAD before the change and from a build after it, both against the test database; the two files are identical byte for byte.
- New specs: `schedules.service.spec.ts` (period check on create and update against the stored end, 404, delete only without lessons; before, the spec only checked "defined"), `lesson-slots.service.spec.ts`, `school-account-deletion.spec.ts` (409 per assignment table, lock before counting, profile deletion); the identity specs follow the move.
- tsc, lint (0 errors, 75 warnings), knip, dependency-cruiser and build pass. `act`: all three jobs succeeded.
- `code-review` (high): no new bugs; the hand-off keeps the transaction, the lock order and the 409. 9 findings. Fixed: (3) untyped schedule records, (4) the 409 rule in infrastructure (now an application participant on a port), (5) mocks shared between tests, (6) a Prisma mock in the stub spec, (7) two input-typing conventions, (8) leftover `include: {}`, (9) duplicated period checks. Kept for M36, where these services become real:
  - (1) `PATCH`/`DELETE /lesson-slots/:id` for a missing slot answers 500 (Prisma P2025), `GET` answers 200 with an empty body (as before).
  - (2) Deleting a schedule while a slot is added can fail the foreign key (500 instead of 400), as before.

**Learned (for later milestones):**
- A participant that can refuse runs its check before any participant writes, inside the same unit of work, so the locks of identity-access and the other context are taken in a fixed order (user, then the context's rows).
- A `GET /api-json` comparison needs a build of the old state first; the controller registration order shapes the file.

**Failed / open:** (1) and (2) for M36.

## 2026-11-08 – M36: School organization on the real API

**Done:**
- Backend (school-organization context):
  - Classes, departments, subjects and rooms are real CRUD on Prisma (they were stubs returning text). Lists are sorted by name; departments carry `class_count`, classes `department`, `head_teacher`, `student_count` and `teacher_count`.
  - Decision D2, no schema change: `GET /classes/:id` returns the department, the schedule, the head teacher (`head_teacher_id`), the students (`students.class_id`) and the teachers (`classes_teachers`), with names and no e-mail. `PUT /classes/:id/students` and `PUT /classes/:id/teachers` replace the assignment in one transaction, with the profile checks inside it; IDs without a student or teacher profile are a 400.
  - Rights (UC-20): `manage_classes` (Admin, Superuser) changes every class; a teacher who heads or teaches the class changes its members, otherwise 403. A teacher may add unassigned students but not take students out of another class; that move is the administration's.
  - `GET /classes/assignable` lists the students (with their class) and teachers for the member editor; it is for `manage_classes` and teachers only (403 for students).
  - Department, schedule and head teacher of a class must exist (400 instead of a 500). A delete that a foreign key still blocks answers 409 with a message (`deleteUnlessReferenced`): a department with classes, a subject or room with lessons, a schedule with classes, a class with a chat. Deleting a class removes its assignments in its own transaction.
  - Update DTOs keep the name non-empty (`null` was accepted through `PartialType`). The class routes take `ParseIntPipe`.
  - Lesson slots answer 404 for a missing slot (open item (1) of M22).
- Frontend:
  - `api/schoolOrganization.js` (one CRUD factory, plus the class membership calls) and `stores/entities/schoolStores.js`: stores for classes, departments, subjects, rooms and schedules; they keep the backend's message of a refusal (403, 409) for the page.
  - `ClassListView`, `ClassDetail`, `DepartmentView`, `SchedulesView` and the dashboard work on the stores; the localStorage storage (`effsync_classes`, `effsync_departments`, `effsync_schedules`, the dashboard's `effsync_*` fallback) and the mock data in `ClassDetail` are gone. `ClassForm` picks department, head teacher and schedule from the API.
  - `ClassDetail` shows and edits both member lists (checkbox editor) for Admin/Superuser and the class's own teachers.
  - New `SubjectView` and `RoomView` (on the shared `SchoolCatalog` component) with routes `/subjects` and `/rooms` and dashboard cards (Admin/Superuser only); the class routes and the sidebar link are open to teachers.
  - `SchedulesView` started in a `week` mode the template doesn't have, so the page was empty for every role; it starts with the list now.

**Verified:**
- Done when:
  - `grep -rn "effsync_" frontend/src/views`: only `UserProfileView` (the profile cache, not school data; M25/M27). No view writes school data to localStorage.
  - Vitest: `schoolOrganization.spec.js` (all five APIs), `schoolStores.spec.js` (each store: load, create, change, delete, the kept refusal message; nothing in localStorage), `SchoolCatalog.spec.js`.
  - `test/school-organization.e2e-spec.ts`: creating a class, assigning two students and a teacher, reading them back (names, no e-mail; the old class keeps the other three), a teacher of another class getting 403, a teacher of the class changing its teachers, no move out of another class for a teacher, 400 for users without a profile, the assignable list (403 for a student), departments/subjects/rooms CRUD with 409 for one in use, 400 for an empty name, and 404 for a missing lesson slot.
  - Click-through of all five areas, against a backend on the test database (`effsync_test`) and the frontend dev server, driven by a Playwright script in Chromium instead of by hand (run again after the review fixes): departments (create, rename, the 409 message for Informatik), subjects (create, edit, delete), rooms (create with capacity, delete), schedules (list from the API, create, detail), classes (create with department, head teacher and schedule; assign two students; a reload keeps them; the head teacher edits the teachers; a teacher of another class sees no edit button). Afterwards localStorage held only `userRole`, `refreshToken`, `userId` and `authToken`. Screenshots were checked.
- Backend: 526 unit and 105 E2E tests. Frontend: 28 files, 240 tests. tsc, lint (backend 0 errors, 75 warnings; frontend clean), knip, dependency-cruiser and both builds pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings, 9 fixed: (1) deleting a schedule used by a class answered 500, (2) a teacher could take students out of other classes, (3) students could list everyone, (4) clearing an optional catalog field was lost, (6) `name: null` passed validation, (7) existence checks loaded the whole class twice, (8) profile checks outside the transaction, (9) the subject and room cards were shown to every role, (10) the member editor opened without candidates. Not done:
  - (5) The frontend decides "can manage" by role (Admin, Superuser), the backend by the `manage_classes` permission. A Teacher with a direct `manage_classes` grant (seed scenarios 2 and 3) can use the API but sees no buttons. The frontend has no permission data yet; that belongs to M25 (stores and the `api/` layer).

**Learned (for later milestones):**
- A Postgres transaction is unusable after a failed statement, so a "delete unless referenced" must end its own transaction with the error rather than catch it inside an open one.
- `PartialType` makes required fields optional and accepts `null`; a field that must stay non-empty needs its own `ValidateIf` rule on update.

**Failed / open:** (5) above.

## 2026-11-08 – M21: DM deduplication, task- and class-linked chats

**Decision recorded (the milestone's risk):** existing duplicate DMs are accepted, not merged. The app never sent a `direct_chat_hash` before M21 (the DM modal created a private room and invited the partner), so DMs made by the app have no hash and nothing collides with the new ones; they stay as they are. Only DMs created from M21 on are deduplicated. The seeds' DMs already use the server's format.

**Done:**
- T113 (`07_…:267-269`): `POST /chat-rooms/direct {user_id}` builds `direct_{min}_{max}` from both IDs (the seeds' format; the thesis' `user1_user2`). Under an advisory lock on the hash, in one unit of work, it returns the existing room or creates it with both people as members; a second request, from either side, gets the same room and both are (again) members. `POST /chat-rooms` ignores a client's `direct_chat_hash` (the M2 test flipped). A DM with oneself is a 400, with an unknown or inactive user a 404.
- T29: `POST /chat-rooms/task/:taskId` and `POST /chat-rooms/class/:classId` find or create the linked group chat under an advisory lock.
  - Task chat: for whoever sees the task (decision B3, else 404); its people are the creator, the assignee and the members; the task's creator owns it.
  - Class chat: for the class's students and teachers (decision D2, else 403); the head teacher owns it. The seed's "5AHITM Klassenchat" is used, not duplicated.
  - The opener is (again) a member; other people are added only if they never were, so leaving or a removal sticks.
  - `POST /chat-rooms` ignores `task_id` and `class_id`, so nobody makes their own room a task's or class's chat.
  - Facades: `TaskChatService` (task-management) and `ClassChatService` (school-organization, which gets an `application/index.ts` and becomes global like task-management).
- Realtime: `RealtimePublisher.addUserToChannel`; added members' sockets join the room and get `room:new`, also when the creator adds a member over REST (open item (9) of M20).
- Frontend: the DM modal uses `chatStore.openDirect`; the task card has a 💬 button and the class detail a "Klassenchat" button, both opening `/chat?room=<id>`, which `ChatView` selects. `room:new` only refreshes the room list (it used to switch the open conversation). `ChatRoomItem` shows Direkt, Gruppe, Aufgabe or Klasse from `is_private`, `task_id` and `class_id` instead of the member count.

**Verified:**
- Done when:
  - `test/chat-links.e2e-spec.ts` creates the same DM twice and gets one room ID (`direct_4_6`, both members), and opens a task's chat twice, from the student and the teacher, with one room, `task_id` set and the task's people as members. It also covers the seed DM's hash, the 400 for oneself, the ignored client hash and `class_id`, that leaving a task chat sticks until one opens it again, the task creator as owner, the 404 for someone who doesn't see the task, and the class chat with every current class member.
  - The task chat opens from the task card: Vitest (`TaskCard.spec.js`: the button calls the store with the task ID and opens `/chat?room=12`) and a browser check in Chromium against the test database: the 💬 button on a task card opened `/chat?room=7` with `task_id` set and the room selected; choosing the same DM partner twice in the modal left one room (`direct_2_6`). Screenshot checked.
- Backend: 537 unit and 108 E2E tests. Frontend: 29 files, 246 tests. tsc, lint (backend 0 errors, 75 warnings; frontend clean), knip, dependency-cruiser and both builds pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings, 9 fixed: (1) the partner of a new DM wasn't subscribed live, (2) a self-made room could become a task's or class's chat, (3) `room:new` switched every added member's open chat, (4) the class page kept showing "wird geladen", (5) concurrent opens could create duplicate active memberships (now one locked unit of work for find, create and members, also for DMs), (6) leaving or a removal didn't stick, (7) the first opener owned the chat, (9) a redundant room list fetch, (10) a quadratic membership diff. Kept: (8) DMs from before M21 without a hash are not found by the hash (the decision above).

**Learned (for later milestones):**
- `pg_advisory_xact_lock` returns `void`, which Prisma's driver adapter can't read back; select a constant from it.
- A find-or-create that relies on a UNIQUE violation can't catch the error inside the transaction; a lock around find and create avoids the violation instead.
- Deleting a class that has a class chat answers 409 (M36's rule); the class chat has to go first.

**Failed / open:** (8) above, by decision.

## 2026-11-09 – M23: Migrate notifications (e-mail, preferences); deadline jobs in task-management

**Deviation recorded:** GOALS.md moves "cron jobs" into notifications. The deadline jobs went to task-management instead (`TaskDeadlinesService`, scheduled by `TaskDeadlineJobs`): the hourly job locks tasks, which is task-management's rule (feature #27, `TaskLockingService.lockOverdueTask`), and task-management already depends on notifications (Notifier, the mailers). Jobs in notifications would need notifications → task-management, a cycle between contexts, which `depcruise:contexts` forbids. The jobs reach mail and in-app notifications only through notifications' ports, which is what the milestone's "other contexts trigger them only through notifications/application" asks.

**Done:**
- `src/contexts/notifications` replaces `modules/notifications` and `modules/email`:
  - Application: `NotificationsService` (the in-app notifications, `notification:new` through `RealtimePublisher`), `InAppNotifier` (the `Notifier` port of M16), `EmailService` (deadline, @mention and password-reset mails on the `MailTransport` port, each logged in `email_logs`; templates moved, user text now escaped), `DeadlineMailService` (the deadline mail only with `email_on_deadline`), `PasswordResetMail` (identity-access's `PasswordResetMailer`), `EmailPreferencesService`.
  - Ports exported to other contexts: `Notifier`, `MentionMailer` (moved from task-management, so the dependency runs task-management → notifications only) and `DeadlineMailer`.
  - Infrastructure: Prisma repositories, `NodemailerMailTransport` (the M13 environments and the test outbox, unchanged), `NotificationsAccountDeletion` (own notifications deleted, the sender's name in other members' chat notifications replaced by the ghost user's; moved from `PrismaUserRepository`).
  - Presentation: `/notifications` (same routes; a duplicate unreachable `GET unread-count` handler removed) and `/email-preferences` (same envelope; the body is validated now).
- task-management: `TaskDeadlinesService` with the daily reminder (08:00) and the hourly overdue lock, the queries `findDueBetween`/`findOverdueUnlocked`, and `TaskDeadlineJobs` with the two `@Cron`s. The lock goes through `lockOverdueTask` (7 days, reason OVERDUE, and now `task:locked` to the assignee).
- `ScheduleModule.forRoot()` moved to AppModule (it ran from EmailModule); `frontendUrl()` moved to `shared/application`. The unused `sendCommentEmail` and `sendTestEmail` are gone.
- Lint: notifications has 0 `no-unsafe-*` findings and the rules are `error` there (Q13). Ratchet 75 → 43.

**Verified:**
- Done when:
  - 0 dependency violations, 0 context cycles (5 contexts with dependencies).
  - The e-mail cron (T46): `task-deadlines.service.spec.ts` (range from now to the end of the third day, mail and in-app reminder, calendar days, a failing task doesn't stop the others), `email.service.spec.ts` (subject by the days left), `DeadlineMailService` (mails by default and with the preference, not when it is off or without an address), `task-deadline.jobs.spec.ts` (daily at 8, hourly; a failing run is logged).
  - The @mention mail (T09): `email.service.spec.ts` (recipient, subject, commenter, task and excerpt in the HTML, logged as `mention`, a failed send logged and answered with false) and the existing T09 tests of `comments.service.spec.ts` against the moved port.
  - The hourly overdue job: locks each overdue task, mails and notifies its assignee, nothing without overdue tasks.
- `test/notifications.e2e-spec.ts` (own user): default preferences on first read, changing them, 400 for an invalid frequency, listing/counting/marking notifications, 404 for someone else's notification.
- Backend: 554 unit and 111 E2E tests. tsc, lint (0 errors, 43 warnings), knip, dependency-cruiser and build pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings, 8 fixed: (1) `GET /notifications/:id` showed anyone's notification (now 404), (2) user text was put unescaped into the mail HTML, (3) the mail links used `APP_URL` instead of `FRONTEND_URL`, (4) the in-app reminder counted days differently from the mail, (5) the daily reminder repeated the overdue mail for tasks already past and locked, (7) a race on the first preferences read (now one upsert), (8) one failing task stopped the run, (10) the E2E test changed seed data. Kept:
  - (6) The `email_on_mention` check stays in task-management's comment repository, which reads `email_preferences`; the T09 tests pin it there. Moving it into a `MentionMailer` implementation like `DeadlineMailService` is a follow-up.
  - (9) The hourly job reads each task again in `lockOverdueTask` and the preferences per task (N+1); fine at school size.

**Learned (for later milestones):**
- A context dependency can force a job into the context whose data it changes, even when the milestone names another; the ports keep the boundary.
- knip runs in the backend CI job: an export only a spec might use still fails it.

**Failed / open:** (6) and (9) above.

## 2026-11-09 – M24: Migrate reporting, with the dashboard metrics per thesis

**Open question (raised, no schema change):** completion dates can't be derived reliably. The activity log records "Task updated" without the status, and the completion from grades (M17) writes no entry. The trends therefore count a completed task as completed at its last change (`tasks.updated_at`); a later edit of a completed task moves it into the current period. Options for the user: accept the approximation; log the change to COMPLETED in the activity log from now on (no schema change, old data stays approximate); or add a `completed_at` column (a schema change that needs approval).

**Done:**
- `src/contexts/reporting` replaces `modules/metrics` (read-only, GOALS.md M24 step 1):
  - Domain: `trendSeries` (created and completed tasks per week, Monday-based with ISO calendar-week labels "KW 46", or per month "Nov 2026") and `projectProgress` (the share of completed tasks in the project's subtree; without subtasks the project's own progress).
  - Application: `ReportingService` with the existing three metrics (unchanged shapes) and the new queries: active projects with their progress (T41, T39, FA-30, FA-34, decision Q2: top-level tasks that aren't completed), the top 5 members by completed tasks (T40, FA-35), and the trends (T37, FA-33, decision A4: 8 weeks or 6 months).
  - Every metric counts the tasks the user sees in the task list: task-management's `TaskVisibilityService` (decision B3; staff all, others their own, assigned and member tasks with their subtasks). Before, Admin and Superuser saw all and everyone else only their direct tasks, so a teacher's dashboard counted fewer tasks than their task list.
  - Infrastructure: `PrismaReportingRepository` (one recursive query for all project subtrees, a `groupBy` for the ranking).
  - Presentation: `/metrics` keeps its three routes and gets `projects`, `top-members` and `trends?period=week|month` (400 for anything else).
- Frontend: `StatusDistributionChart` is a doughnut (FA-32) and no longer loads the unused `tasks-by-status`; new `TrendChart` (line chart with a weekly/monthly switch, FA-33), `ProjectProgressList` (active projects with progress bars, FA-30/FA-34) and `TopMembersList` (FA-35) on the dashboard; `fetchMetrics` takes query parameters.
- Lint: reporting has 0 `no-unsafe-*` findings and the rules are `error` there (Q13). Ratchet 43 → 36.

**Verified:**
- Done when:
  - The new metric queries have unit tests: `trends.spec.ts`, `projects.spec.ts`, `reporting.service.spec.ts` (scope, FA-31 counts, the overdue donut slice, projects with subtree progress, top 5, 8 weeks and 6 months), `prisma-reporting.repository.spec.ts` (project query, one recursive subtree query, ranking with names, empty scope).
  - The dashboard shows the FA-30 to FA-35 elements: checked in Chromium against a backend on the test database, as admin. FA-31 (the counts), FA-32 (the doughnut), FA-30/FA-34 (18 active projects with progress bars), FA-35 (the ranking), FA-33 (the trend line, switched to monthly). Screenshot checked. (Run before the review fixes below, which changed the scope for non-admins, the error texts and the dark-mode colors.)
- `test/reporting.e2e-spec.ts` against PostgreSQL: a project's progress over its subtree including a grandchild (2 subtasks, 50 %), subtasks not listed as projects, the ranking (at most 5, descending), the trends per week and month, 400 for another period.
- Backend: 569 unit and 114 E2E tests. Frontend: 30 files, 252 tests. tsc, lint (backend 0 errors, 36 warnings; frontend clean), knip, dependency-cruiser (0 violations, 0 context cycles) and both builds pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 9 findings. Fixed: (2) the dashboard counted fewer tasks than the task list, (3) a failed request showed "no projects", (4) an older trend answer could replace the newer period's data, (5) the project rows suggested a click that only opened the unfiltered task list, (6) the new cards ignored dark mode, (7) the unused `tasks-by-status` request, (9) a second fetch helper. Kept:
  - (1) The completion date from `updated_at`: the open question above.
  - (8) status-distribution and task-progress load the visible rows to count them; a `groupBy` would be cheaper, fine at school size.
  - (9, part) The four cards repeat their card CSS; a shared style belongs to M25's frontend layering.

**Learned (for later milestones):**
- With `declaration` builds, a type a public method returns must be exported, even when knip would like it private; name it as the return type.
- Playwright treats a 0 px wide element as hidden: check a 0 % progress bar by its track.

**Failed / open:** the completion-date question above.

## 2026-11-09 – M29: Coverage targets and API endpoint tests per thesis

**Done:**
- Coverage targets of `08_…:39-43` (T115, T117), in the new context locations, on lines, statements, functions and branches each:

  | Unit (thesis name) | File | Target | Now (branches) |
  |---|---|---|---|
  | AuthService | `identity-access/application/auth.service.ts` | ≥ 90 % | 92 % |
  | JwtAuthGuard, LocalAuthGuard | `identity-access/presentation/security/{jwt,local}-auth.guard.ts` | ≥ 90 % | 100 % |
  | TaskService | `task-management/application/task.service.ts` | ≥ 90 % | 92.4 % (was 85.5 %) |
  | UserService | `identity-access/application/users.service.ts` | ≥ 75 % | 83.8 % |
  | PermissionService | `identity-access/application/permissions.service.ts` | ≥ 75 % | 94.6 % |
  | Auth store | `frontend/src/stores/authStore.js` | ≥ 90 % | 95.7 % (was 38 %) |
  | Task store | `frontend/src/stores/entities/taskStore.js` | ≥ 90 % | 93 % (was 33 %) |
  | HTTP utility functions | `frontend/src/api/httpClient.js` | ≥ 90 % | 90.6 % |
  | Route guards | `frontend/src/router/guards.js` (moved out of `router/index.js`) | ≥ 75 % | 100 % |

  "Wiederverwendbare komplexe UI-Komponenten" (≥ 75 %) names no component, so no threshold is set for them.
- Enforcement: per-file `coverageThreshold` in the backend's Jest config (glob keys, so it works from any directory) and per-file `thresholds` in Vitest (all source files included, so a file no test imports fails at 0 % instead of being skipped). CI runs `test:coverage` in both test jobs; `vitest --coverage` became `vitest run --coverage`.
- New tests: `task.service.paths.spec.ts`, `authStore.spec.js` (login, logout, reload, register, dev mode), `taskStore.rules.spec.js` (every rule operator, parents after a status change, a rule cycle, saving rules, subtasks), `guards.spec.js`, the request interceptor in `httpClient.spec.js`.
- API endpoint tests for the table in `08_…:112-138` (T121, T123): `test/api-auth-endpoints.e2e-spec.ts` and `test/api-task-endpoints.e2e-spec.ts`, each with the matrix in its header. Every endpoint has its happy path and 400, 401, 403 and 404, except combinations it can't produce, which are listed with the reason: register (public; 409 for a taken name instead of 404), login (missing fields are a 401 from the credentials guard; an unknown user is a 401, no account enumeration), logout (public; an unknown token is idempotent, 204), `GET /tasks` (a list, no 404).
- Found by the matrix: registering with a taken username or e-mail answered 500. `assertUnused` (its own module) checks username and e-mail (case-insensitively, like the login) in one query, for registration and the admin's user creation, and the repository turns the unique index (P2002) into a 409 on create and update too.

**Verified:**
- Done when:
  - CI fails if a threshold drops: checked by raising a threshold above the measured value (backend and frontend: exit 1, CI step fails) and by running a single spec (the untested files fail at 0 %).
  - All endpoint/status combinations of the table are tested (22 E2E tests, the N/A ones documented).
- Backend: 594 unit and 136 E2E tests. Frontend: 305 tests. tsc, lint (backend 0 errors, 36 warnings; frontend clean), knip, dependency-cruiser and both builds pass. `act`: all three jobs succeeded, with the coverage thresholds.
- `code-review` (high) gave 10 findings, all fixed: (1) the e-mail check was case-sensitive while the login isn't, (2) races and PATCH still answered 500 (P2002 now a 409), (3) an untested file skipped its threshold silently, (4) a test without an assertion, (5) a cycle test that never followed the cycle, (6) a misleading test title and comment, (7) the uniqueness rule lived in auth.service.ts, (8) the threshold paths only worked from `backend/`, (9) the throttle budget of the auth matrix (now a comment), (10) two queries for the uniqueness check.

**Learned (for later milestones):**
- Jest resolves `coverageThreshold` path keys against the working directory, not `rootDir`; glob keys work from anywhere.
- Vitest 4 measures only imported files unless `coverage.include` is set, so a per-file threshold can pass because nothing loaded the file.

**Failed / open:** none.

## 2026-11-09 – M30: Non-functional requirements, Swagger docs, HTTPS only and join indexes

**Done:**
- Load test (T61): `npm run load-test` (`backend/scripts/load-test.mjs`, autocannon) logs in a teacher, a student and the admin and runs five main endpoints with 10 and 100 concurrent connections for 10 s each. It fails (exit 1) when p97.5 ≥ 200 ms at 10 connections or when any request fails. Run against the seeded test DB on port 5433.
- Join indexes (T87, Q8h): one index-only migration `20261109090000_join_indexes` on `tasks.parent_task_id`, `tasks.created_by`, `tasks.assigned_to`, `task_members.user_id`, `chat_messages(room_id, created_at)`, `notifications(user_id, created_at)`, `task_activity_log.task_id` and `chat_room_users.user_id`. `prisma migrate diff` from the migrated DB to the schema is empty.
- Swagger (T65): all 19 controllers have `@ApiTags`, each declared with a description in `API_TAGS` (`app.setup.ts`); the token-guarded ones have `@ApiBearerAuth` and the 401/403 responses, and the routes guarded on their own (`/auth/profile`, `/auth/set-new-password`) the bearer token and the 401. All 135 operations of the OpenAPI document have a one-line summary. The Nest Swagger CLI plugin (`introspectComments`, `classValidatorShim`) documents the DTOs. `src/swagger-docs.spec.ts` reads the guards as Nest does and fails if a controller or route loses its tag, summary, bearer token or 401/403.
- HTTPS only (T62, Q4): with `NODE_ENV=production` the app sets `trust proxy` and answers a request whose `X-Forwarded-Proto` isn't `https` with a 308 to the same path under `PUBLIC_URL` (`shared/presentation/https-only.ts`); Helmet's HSTS stays. Config validation requires `PUBLIC_URL` as an `https://` address in production (`.env.example` names it). The README (EN and DE) describes the reverse-proxy requirement, that the backend port must be reachable only through the proxy, and that `THROTTLE_LIMIT` must be raised when users share one NAT address.

**Verified:**
- Load test on the seeded test DB, p97.5 in ms at 10 connections / 100 connections, 0 failed requests in every run:

  | Endpoint | Before indexes | After indexes |
  |---|---|---|
  | `GET /api/tasks` (list) | 175 / 1152 | 169 / 1121 |
  | `GET /api/tasks/1` (detail) | 136 / 1523 | 151 / 1635 |
  | `GET /api/metrics/task-progress` | 89 / 718 | 92 / 749 |
  | `GET /api/notifications` | 80 / 631 | 85 / 643 |
  | `GET /api/chat-rooms` | 88 / 667 | 87 / 733 |

  After the review fixes, a last run on the seeded DB: 179 / 1235, 122 / 1104, 104 / 815, 83 / 660, 93 / 749 (same order), 0 failed, exit 0.

  NFA-01 (< 200 ms) is met at 10 connections. NFA-03 (100 concurrent users) is met as "served without errors": at 100 connections the latency is queueing on one Node process (throughput stays at 80–170 requests/s), not a slower query.
- EXPLAIN ANALYZE on the scaled test DB (20,000 rows, see below), before → after: notifications of a user 2.12 → 1.65 ms (seq scan → index), chat messages of a room 6.58 → 3.45 ms, subtasks of a task 1.50 → 0.10 ms, tasks created by or assigned to a user 2.58 → ~1.4 ms, task memberships of a user 1.53 → 1.11 ms, activity log of a task 1.16 → 0.16 ms.
- Load time (NFA-02, < 3 s), Lighthouse 12 on the production build (simulated mobile throttling): login LCP 2.0 s, FCP 1.7 s, TTI 2.0 s, TBT 50 ms, performance score 0.98. The logged-in dashboard loads in 1.2–1.4 s.
- HTTPS: `test/https-redirect.e2e-spec.ts` in production mode: `http` GET with a foreign `Host` header → 308 to `https://effsync.example/api/tasks?page=2` (the configured `PUBLIC_URL`), `http` POST → 308, `https` → 200 with the HSTS header. Unit tests for the middleware and the config validation.
- Responsive and browser checklist (T66, T71), Playwright 1.62 with Chromium and Firefox, mobile 375 px, tablet 768 px and desktop 1440 px, as the admin, on dashboard, tasks, calendar, chat, documents and classes:
  - [x] every page loads (0.7–1.4 s) with its main content visible and without page errors, in both browsers and all three widths (36 checks)
  - [x] no horizontal overflow at any width
  - [x] screenshots of dashboard and tasks per browser and width looked through by hand
  - [ ] minor at 375 px: the header search field is cut off, and the button in the task header wraps to a second line (cosmetic; for the frontend milestones)
  - Edge can't run on this Linux machine; it uses the Chromium engine, which is covered. A manual check in Edge on Windows is still open.
- Backend: 618 unit and 139 E2E tests. tsc, lint (0 errors, 36 warnings), knip, dependency-cruiser and the build pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 10 findings, all fixed: (1) psql ran the inserts after the not-a-test-DB guard raised (now `ON_ERROR_STOP`; checked on a throwaway non-test DB: exit 3, 0 rows), (2) the redirect target came from the client's `Host` header (now `PUBLIC_URL`), (3) the README didn't say that the backend port must be reachable only through the proxy, or a client fakes `X-Forwarded-For` around the rate limit, (4) the spec found guards by a regex and missed three controllers and the method-level guards; it now reads the guard metadata and checks 401/403, which also found the missing 401/403 docs of the task and notification controllers, (5) `set-new-password` had no bearer token in the docs, (6) the load test's tokens expire after 15 minutes, so `--duration` is now limited to 1–60 s, (7) users, roles and permissions named the bearer scheme twice, (8) their summaries were the JSDoc copied with route and line breaks (now one line plus a description; three routes claimed "only a JWT" but need `view_dashboard`), (9) the Swagger setup declared 8 of 19 tags, (10) `process.exit()` could cut off the piped JSON (now `exitCode`).

**Learned (for later milestones):**
- The seed data is too small to show a performance problem. `scripts/load-test-data.sql` adds 20,000 tasks, notifications and chat messages, and refuses to run on a database whose name doesn't end in `_test`.
- Indexes barely change the response time on this data, because each request spends ~29 ms on the auth and permission queries, and the list endpoints load whole result sets.

**Failed / open:**
- On the scaled test DB, NFA-01 fails: the task list 454 → 514 ms p97.5 (before → after indexes), the task-progress metrics ~1.7 s, and `GET /api/notifications` times out at 10 connections (it has no paging). This became the fix milestone **M37: Performance at realistic data volume**, placed right after M30.
- The completion-date question of M24 is still open.

## 2026-11-09 – M37: Performance at realistic data volume

**Done:**
- Profiled first: on the scaled data of M30 a student's list sent the student's whole visible set (9,336 ids) from Postgres to Node and back into the next queries as 9,336 bind parameters, the metrics loaded every task into Node, `GET /notifications` had no paging, and every request spent ~10 ms of Node CPU on 9 auth and permission queries (Prisma splits each include into its own statement).
- The visible set (decision B3) is one SQL fragment, `shared/infrastructure/prisma/task-scope.sql.ts` (the `TaskScope` type in `shared/application`), that the task list and all dashboard metrics embed. The base case is three index scans instead of one scan of all tasks with `OR` (85 → 30 ms for 9,336 rows; the same set for all 9 users of the scaled DB, checked by count and id sum). `TaskVisibilityService.scopeFor` replaces `visibleIdsFor`; the old id query is gone.
- `GET /tasks`: the page's ids and the count as two parallel SQL queries (a window count over the 20,000 tasks of a teacher took twice as long), then the page's rows with Prisma.
- Dashboard (`reporting`): all queries in SQL over the scope; task progress and the status donut come from one aggregate query per status and overdue flag.
- `GET /notifications` is paged like `GET /tasks` (`page`, `limit` ≤ 100, default 50, newest first, `{ data, meta }`). The frontend store loads the newest page, counts the unread ones on older pages from `/notifications/unread-count`, marks all as read with one `PATCH /notifications/mark-all-read`, and loads older pages with "Ältere laden".
- Per request: `JwtStrategy` reads the user and the first role in one query (`findSessionUser`, was 3), and `hasPermission` reads all grants of the name and its alias in one query (`findGrants`, was 6 per name). The rules stay: a direct grant counts inside its validity window, a role grant without one; per name the first grant counts, now in a fixed order (lowest permission id, then lowest role id; `findFirst` without an order took any row). Login reads the roles in the same order. Node CPU for the checks: 10.4 → 1.6 ms per request.
- Bugs found on the way, with tests: a `%` or `_` in the task search was a wildcard (now escaped); `sortBy` took any string, an unknown one was a 500 and is now a 400 (whitelist `TASK_SORT_KEYS`, also checked before the raw SQL); marking one notification as read called `PATCH /notifications/:id`, which doesn't exist (404), so it never worked; "mark all as read" marked only the loaded ones.
- `scripts/load-test-data.sql` spreads the same volume over a school-sized set of users (decision I1): 750 students, 40 teachers, three student members per task. A student sees 177–203 tasks, user 4 has 29 notifications.

**Verified:**
- Done when: `npm run load-test` on the scaled test DB (seed plus `load-test-data.sql`) exits 0 in two runs in a row. p97.5 in ms at 10 / 100 connections, 0 failed requests in every run:

  | Endpoint | M30 data, before M37 | M30 data, after M37 | School spread, run 1 | School spread, run 2 |
  |---|---|---|---|---|
  | `GET /api/tasks` (list) | 514 / 4300 | 356 / 2101 | 193 / 1720 | 160 / 1544 |
  | `GET /api/tasks/:id` | 178 / 1258 | 146 / 1514 | 127 / 1086 | 139 / 1128 |
  | `GET /api/metrics/task-progress` | 1712 / 9803 (72 failed) | 224 / 1409 | 130 / 818 | 142 / 931 |
  | `GET /api/notifications` | timeout (20 failed) / 6061 | 129 / 769 | 59 / 471 | 55 / 466 |
  | `GET /api/chat-rooms` | 85 / 691 | 88 / 744 | 62 / 506 | 61 / 472 |

  The M30 data stays as the stress result: there one student saw 9,336 of 20,000 tasks, and Postgres alone answered only ~40–52 of those list queries per second on this machine (measured without the app, 10 clients). The test machine is a desktop with a load average of 3–5 from other programs, so the numbers are on the pessimistic side.
- Seed data after M37 (no regression): 170, 127, 96, 88 and 80 ms p97.5 at 10 connections, 0 failed.
- New tests: E2E for sorting, filters, search with `%`, a page past the end, an unknown sort key, the metrics over the same visible set and the staff counts (`task-visibility.e2e-spec.ts`); notification paging (`notifications.e2e-spec.ts`); the validity window of a direct grant against PostgreSQL, ±30 minutes, with Node in Europe/Vienna and Postgres in UTC (`permission-validity.e2e-spec.ts`). Unit tests for the scope SQL, the list query, the reporting queries, `JwtStrategy`, the roles order, the store and the list component.
- Backend: 636 unit and 148 E2E tests. Frontend: 317 tests. tsc, lint (backend 0 errors, 36 warnings; frontend clean), knip, dependency-cruiser and both builds pass. `act`: all three jobs succeeded.
- `code-review` (high) gave 9 findings. Fixed: (1) a time-zone shift in the metrics' date comparisons: a bare `Date` went to Postgres as text without an offset, which `::timestamptz` read in the session's time zone (confirmed in a Europe/Vienna session; now ISO text with `Z`), (3) the 404 on marking one notification as read, (4) older notifications were unreachable after paging ("Ältere laden"), (6) login and `JwtStrategy` picked the first role in different orders, (8) the two SQL forms of the visibility rule now point to each other, (9) a misplaced doc comment. Kept: (5) an unknown query parameter on `GET /notifications` is a 400, as on `GET /tasks`; (7) the page's rows are read in a second round trip (a task deleted in between leaves the page one short until the next load).

**Learned (for later milestones):**
- Measure where the time goes before optimizing: the indexes of M30 changed nothing because the time was in Node (id lists, Prisma's split includes), and later the database became the limit (the CPU profile showed Node idle 62 %).
- Prisma 7 sends every include as its own statement unless the `relationJoins` preview is on; on hot paths one raw query is far cheaper.
- `pg` sends a JS `Date` without an offset; in raw SQL compare against ISO text with `Z`.
- `log_min_duration_statement = 0` slows a load test noticeably; reset it before measuring.

**Failed / open:**
- Decision for later (not changed here): `hasPermission` checks only the first grant per name and source, as before M37 (now in a fixed order). A user whose lower role has fewer flags for a name than a higher role gets a 403. Checking every grant would be the usual meaning, but it changes the permission rules.
- The completion-date question of M24 is still open.

## 2026-11-09 – M31: Backup and restore scripts

**Done:**
- `backend/scripts/backup.sh`: a full logical dump in PostgreSQL's custom format (`pg_dump -Fc --no-owner --no-privileges`, the strategy of `documents/AP7-6.md`), readable only by its owner (`umask 077`), by default in `backend/backups`. It writes under a temporary name until all of the archive reads back, so a failed run leaves no file; `BACKUP_DIR` and `BACKUP_KEEP_DAYS` (rotation) are optional.
- `backend/scripts/restore.sh`: reads all of the dump back, shows database and server and asks for the database name to confirm (`RESTORE_CONFIRM` for scripts), then drops the schema `public` with everything in it and restores the dump, in one `psql --single-transaction` with `ON_ERROR_STOP`: the database is the dump afterwards, or nothing changed.
- `backend/scripts/restore-drill.sh`, only on a `*_test` database: backup, restore into a fresh database (a restore without confirmation must be refused and write nothing), then the schema, the data with the sequences and the row count of every table compared with the source; then the same after a second restore over changed data and a newer table with a foreign key into the dump's tables (the recovery case after a migration). `lib/pg.sh` turns Prisma's `DATABASE_URL` into one that libpq accepts (without Prisma's parameters and without the password, which goes to `PGPASSWORD`) and refuses parameters such as `dbname=` that would point libpq elsewhere.
- CI job "Backup Restore Drill": seeds the test database (its own port 5434, so `act` can run it next to the E2E job), installs the PostgreSQL 17 client (the runner's is older, and `pg_dump` refuses a newer server) and runs the drill.
- Runbook "Backup and restore" in `README.md` and `README.de.md`: the Superuser runs it as the operator (UC-41, decision Q7), daily backup with rotation and an off-site copy, restore steps (stop the backend, restore, start the same version, check), the drill. `backups/` is ignored by git.

**Verified:**
- Done when: the CI restore drill is green (`act`: "OK: 38 tables, 177 rows; schema and data restored identically", all four jobs succeeded), and the runbook in both READMEs names the Superuser as the operator.
- By hand: the drill refuses a database not ending in `_test`; `restore.sh` with a wrong confirmation exits 1 and changes nothing (4 tasks before and after); a garbage file is refused before anything is dropped; a backup with a wrong password exits 1 and leaves no file; `BACKUP_KEEP_DAYS=7` deletes a 10-day-old dump; a dump is `-rw-------` in a `drwx------` folder that git ignores; a percent-encoded password (`p%40ss%25w`) arrives decoded in `PGPASSWORD`.
- `code-review` (high) gave 10 findings, 9 fixed: (1) `pg_restore --clean` failed on a table of a later migration with a foreign key into the dump's tables, or left it behind (now the schema is dropped and recreated in the restore's transaction; the drill covers it), (2) the password was on the command line, visible in `ps` (now `PGPASSWORD`), (3) dumps were world-readable (`umask 077`), (4) the default folder depended on the working directory (now `backend/backups`), (5) the drill took any failure as "refused" (now it checks the message and that nothing was written), (6) the drill compared only row counts (now also schema and data dumps, sequences included), (7) a failing count query slipped past `set -e`, (8) `--list` read only the table of contents (now the whole archive), (9) a `?dbname=` parameter could bypass the name check and the confirmation (now refused; the prompt shows host and port). Kept: (10) the drill is its own CI job with its own setup and an apt install of the PostgreSQL 17 client, as step 2 asks for a CI job; folding it into the E2E job would save about a minute per run.

**Learned (for later milestones):**
- `pg_restore --clean` drops only the objects in the dump; a real recovery after a migration needs the whole schema replaced.
- `pg_dump` 16 refuses a 17 server; GitHub's runner ships 16.
- `act` runs jobs side by side on one host, so two jobs can't bind the same service port.

**Failed / open:** none.

## 2026-11-09 – M32: Two-factor authentication (TOTP)

**Done:**
- Table `user_two_factor(user_id PK, secret_encrypted, enabled_at)` (decision Q8d), additive migration `20261109120000_user_two_factor`, deleted with its user (`ON DELETE CASCADE`, so the account deletion of M14 removes it). `prisma migrate diff` from a freshly migrated database to the schema is empty.
- identity-access: `TwoFactorService` with ports for the repository, TOTP (`otplib`: RFC 6238, 6 digits, 30 s, one step of drift), the cipher (AES-256-GCM with `TWO_FACTOR_ENCRYPTION_KEY`, stored as `v1:iv:tag:data`, full 16-byte tag required) and the challenge (a 5-minute JWT signed with `JWT_SECRET:2fa`, so it is never accepted as an access token, like the reset tokens). New dependencies: `otplib`, `qrcode` (the QR code of step 1).
- Routes: `GET /auth/2fa`, `POST /auth/2fa/setup` (secret, otpauth URL, QR code as data URL; 409 if already on), `POST /auth/2fa/enable` and `/disable` with a code (400 for a wrong one), `POST /auth/2fa/verify` (the login's second step, 401 for a wrong code); `POST /auth/login` answers `{ two_factor_required, challenge_token }` instead of tokens when 2FA is on (UC-01b). Admin reset `DELETE /users/:id/two-factor` with `manage_users` (step 5), documented with the SQL fallback in both READMEs.
- Config validation requires `TWO_FACTOR_ENCRYPTION_KEY` as 64 hex characters in every environment; `.env.test` has a throwaway key, `.env.example` the `openssl rand -hex 32` hint.
- Frontend: the login page has a code step; the SecurityTab's 2FA button works (status, QR code with the secret for manual entry, confirm, turn off with a code); the Google callback sends a 2FA user to the code step.
- The refresh path reads the roles by role id too, so login, refresh and `JwtStrategy` take the same first role (follow-up of M37's review).

**Verified:**
- Done when: `test/two-factor.e2e-spec.ts` covers enable (wrong confirmation 400, right 204) → login gives a challenge and no tokens, the challenge is no access token (401) → wrong code 401 → right code gives access and refresh token → a student can't reset (403), an admin can (204) → the old challenge is worthless; the stored secret starts with `v1:` and doesn't contain the secret; deleting a user deletes the row. The SecurityTab button works (Vitest: setup with QR code, enable, wrong code, disable).
- Backend: 670 unit and 152 E2E tests; frontend: 329 tests. tsc, lint (backend 0 errors, 36 warnings; frontend clean), knip, dependency-cruiser and both builds pass. `act`: all four jobs succeeded (a first run failed in two jobs' "Setup Node" step, before any test: two jobs read act's action cache while a third still cloned it; the rerun passed).
- `code-review` (high) gave 10 findings, 9 fixed: (1) Google sign-in skipped 2FA: a 2FA user now gets a challenge (`/auth-callback#challenge=…`, then the code step), and the Google reset path issues a reset token instead of an access token, so it can only set the password; (2) guessing was limited only per IP: five wrong codes in a row lock the user's code check for 15 minutes (429); (3) turning 2FA on now ends the other sessions; (5) enable and disable are throttled like verify; (6) a challenge opens one session only, and a new setup or disable forgets the last used step; (7) a wrong code's 401 no longer makes the frontend refresh or end the session; (8) the admin reset answers 404 for a missing or the ghost user; (9) a GCM tag shorter than 16 bytes is refused; (10) the "too many requests" message shows on the code step. Kept: (4) setup needs no password re-entry, as the app's password change needs none either (a stolen access token is already a full session).

**Learned (for later milestones):**
- `git stash` leaves untracked files in place: a lint comparison against the stashed tree mixes new files with old code.
- A second factor has to cover every way to a session: password login, Google sign-in and any token a reset flow hands out.

**Failed / open:**
- The used codes, the failed attempts and the used challenges are kept in memory: right for one backend process, but a restart forgets them, and a second instance wouldn't share them. A table for them would be a schema change beyond Q8d.
- There are no recovery codes (decision Q8d); a lost phone needs the admin reset.

## 2026-11-09 – M33: Creator required at database level

**Done:**
- Migration `20261109130000_task_creator_required` (decision Q20): creates the ghost user 0 if a database lacks it (as `20261107160000_add_ghost_user`), stops with a clear message if it still lacks it (another account holds the ghost's username or e-mail), moves tasks without a creator to it, then `ALTER TABLE tasks ALTER COLUMN created_by SET NOT NULL`. The foreign key stays as it was.
- Prisma: `created_by Int` and the creator relation required. A task's creator is `number` (not `number | null`) in the task-management ports, `involvedUsersOf`, the task notifications, the documents' access view and the `Task` aggregate; `findAllByCreator` takes a number. The client's `created_by` in `CreateTaskDto` stays ignored, as before: the service sets the requester.
- The delete log's fallback `requesterId ?? task.created_by ?? 0` lost its `?? 0`: the creator is always there. `update()` ignores a creator in its input, as `create()` already did (a `PATCH` with `created_by: null` was a 500, any other id took the task over).

**Verified:**
- Done when:
  - The migration on a copy of the seeded DB (a throwaway `effsync_m33check_test`, migrated up to just before M33, seeded, then a task with `created_by = NULL` added and the ghost user deleted): before, 1 task without a creator and no ghost user; after, the ghost user exists, owns that task, `created_by` is `NOT NULL`, and `prisma migrate diff` to the schema is empty.
  - An insert without a creator fails at database level: `test/task-creator.e2e-spec.ts` writes past the app and Prisma's types (`INSERT … (title)` and `UPDATE … SET created_by = NULL` are refused, a creator that isn't a user too).
  - All task tests pass: backend 671 unit and 156 E2E tests.
- The migration's guard on two more throwaway copies: without the ghost user it creates it and moves the task; with the ghost's username taken by another account it stops with the message and rolls back (the task keeps its NULL, nothing half-applied).
- tsc, lint (0 errors, 36 warnings), knip, dependency-cruiser and the build pass. `act --action-offline-mode`: all four jobs succeeded (two runs before failed in act's own "Setup Node" step, before any test).
- `code-review` (high) gave 10 findings, 8 fixed: (1) `update()` wrote a client's `created_by` (null: 500; another id: takeover); (2) the ghost user's `ON CONFLICT DO NOTHING` could skip silently (now the guard); (3, 4) the update and unlock logs skipped tasks of the ghost user 0, because `if (created_by)` treats 0 as missing; (5) the list filter `created_by=0` was dropped for the same reason; (7) the members list left the ghost out only by that accident (now `!== GHOST_USER_ID`); (8) the E2E test matched any not-null error and depended on seed task 1 (now SQLSTATE 23502 of `created_by`, on its own task, plus the `PATCH` through the API); (9) the `Task` aggregate kept the creator optional (now required). Kept: (6) the task tree loads all of the root creator's tasks, also before M33 and outside its scope; (10) `SET NOT NULL` holds an exclusive lock while it scans `tasks`, which takes milliseconds at a school's size.

**Learned (for later milestones):**
- With the ghost user 0, every truthiness check on a user id is a bug: compare with `undefined` or `GHOST_USER_ID`.
- `act`'s jobs clone the same actions into one cache in parallel; `--action-offline-mode` avoids the race once the actions are cached.

**Failed / open:**
- The thesis appendix (`prisma_schema.tex`) still shows `created_by Int?`; the text at `07_…:82` and decision Q20 call for `NOT NULL`. The appendix is not edited here (`thesis/` is read-only for this work).

## 2026-11-09 – M34: Dependency rules and type-safety lint rules at `error`

**Done:**
- Backend ESLint (decision Q13): `no-unsafe-argument`, `-member-access`, `-assignment`, `-return`, `-enum-comparison` and `-call` (was `off`) are `error` for the whole backend, tests included; the per-context override of M11–M24 is gone, and `lint:check` allows 0 warnings (was a ratchet of 36).
- The last 36 findings: 35 in `test/mitgliederverwaltung.e2e-spec.ts` (the app typed as `INestApplication<App>`, the login and task helpers typed, the asserted bodies read through a typed `bodyOf`) and 1 in `prisma.service.ts` (the connection error read as `Error`). Turning `no-unsafe-call` on added no finding.
- dependency-cruiser: all 10 rules are `error`; the two rules for the legacy `src/modules/` are gone with the folder (all contexts migrated: `src/` holds only `contexts/`, `shared/` and the app's composition root). The CI step names no longer say "warn mode until M34".

**Verified:**
- Done when:
  - All contexts are migrated, and dependency-cruiser runs with severity `error`: 0 violations (293 modules, 989 dependencies), no cycles between contexts.
  - CI fails on a deliberately added violation, tried once and reverted: an import of `@nestjs/common` into `task-management/domain/task.ts` (rule 1) passed lint and knip and failed the job at "Dependency rules (dependency-cruiser, errors since M34)" in `act`.
  - The `no-unsafe-*` rules are `error` for the whole backend with 0 findings; a throwaway file using an `any` value gave 3 errors and exit 1, then was deleted.
- Backend: 671 unit and 156 E2E tests; tsc, knip and the build pass. `act --action-offline-mode`: all four jobs succeeded, with "no cycles between contexts" from the stricter check.
- `code-review` (high) gave 9 findings, 7 fixed: (1) the context-cycle check could never fail CI: `check-context-cycles.cjs` exited 1 only with `--severity error`, which nothing passed (a synthetic a → b → a cycle exited 0); `error` is now its default and the npm script passes it; (2) with the legacy rules gone, nothing kept contexts and `shared/` from importing other folders of `src/`: new rule `target-layout`; (3) the identity-access rule only covered `src/contexts/`: now all of `src/` but itself and `shared/` (a temporary import of `src/app.service.ts` into identity-access tripped `target-layout`, `no-circular` and `domain-no-framework`, then was reverted); (4) the lint glob missed `prisma/*.ts` and `prisma.config.ts` (now linted, 0 findings; the nonexistent `apps`, `libs` dropped); (5) the cycle check's pipe dropped dependency-cruiser's exit code: it now writes `.depcruise-result.json` (ignored by git) and the check reads it only if dependency-cruiser succeeded; (8) the test's task helper didn't check the 201; (9) the bodies are typed per test like the other specs (no `bodyOf`). Kept: (6) the explicit `error` entries repeat the preset, but document decision Q13 and survive a preset change; (7) dependency-cruiser runs twice in CI, a few seconds.

**Learned (for later milestones):**
- A check that only reports is no gate: try the failure (a deliberate violation, a synthetic input) before counting on it.

**Failed / open:** none.

## 2026-11-10 – M25: Frontend layering through stores, one HTTP client, theme per user

**Done:**
- Theme per user (T68, decision Q8f): new table `user_settings(user_id PK, theme)` (`light`, `dark` or `system`, default `light`, the look before M25), migration `20261109140000_user_settings`, deleted with its user; `GET/PATCH /users/me/settings` in identity-access (`UserSettingsService`, port and Prisma repository, `view_dashboard` like the other own-account routes). Frontend: `settingsStore` loads the theme at login (`authStore.startSession`) and in the layout after a reload, applies it to the page, follows the device for `system`, and saves every change on the server; the localStorage keys `theme` and `darkMode` are gone (`LayoutView`, `GeneralSettings`): a value a browser kept from before M25 goes to the server once (unless the user already chose there) and is deleted. The theme loads once per session, a pick made during the load wins, a failed save goes back to the previous theme with a message, and the logout resets it, so the next user in the browser starts light.
- One config module for the backend addresses (problem 14): `src/config/urls.js` (`API_URL`, `WS_URL` from `VITE_API_URL`/`VITE_WS_URL`, else this page's origin: `/api` as the HTTP client did, the sockets at the API's origin) used by the HTTP client, both sockets and the Google links; the three hard-coded `localhost` URLs are gone. Vite's dev proxy forwards `/api` (it stripped the prefix the backend serves under, so it never worked) and now `/socket.io` too.
- Layering (T79, T80, decision Q19): the 20 views and components that imported `@/api/` or `apiClient` read through stores now. New stores: `metricsStore` (the dashboard's metrics and tile counts, step 1), `settingsStore` (theme, e-mail preferences), `documentStore`, `lessonSlotStore`, `userStore`, `taskMemberStore`, `adminStore`; new actions in `authStore` (Google sign-in end, password reset, 2FA settings) and `taskStore` (`moveDeadline`, `unlockWithDeadline`). The new entity stores pass the API's answers through unchanged, so the views kept their handling.
- ESLint (`no-restricted-imports` for `@/api/*` and `**/api/*`, `no-restricted-globals` for `fetch`) in `src/views/` and `src/components/`, spec files excepted; it runs in CI with `npm run lint:check`.
- Tests: every component test that mocked `api/` modules runs through the real stores now (a fresh Pinia per test in `vitest.setup.js`); `AuthCallbackView.spec.js` runs against the real `authStore` with its assertions unchanged.

**Verified:**
- Done when:
  - `grep -rnE "apiClient|fetch\(|from '@/api/" frontend/src/views frontend/src/components` finds only `components/tasks/TESTS_README.md:75`, the documentation of the api/ layer's own test (`src/api/taskMembers.spec.js`), no source file.
  - The ESLint rule runs in CI; a throwaway component with an `@/api/` import, a relative `../../api/` import and `fetch()` gave the three errors, then was deleted.
  - `grep -rn "localhost" frontend/src` finds nothing (the config module needs no development address since the same-origin defaults).
  - Vitest: `authStore.spec.js` "restores the theme from /users/me/settings after login" (the page turns dark, nothing in localStorage).
  - E2E: `test/user-settings.e2e-spec.ts` sets the theme in one session and reads it in the user's second session; an unknown theme or another field is a 400, no token a 401.
- `prisma migrate diff` from a freshly migrated database to the schema is empty.
- Backend: 675 unit and 159 E2E tests; frontend: 380 tests (coverage thresholds included). tsc, lint (backend 0 warnings; frontend clean), knip, dependency-cruiser and both builds pass. `act --action-offline-mode`: all four jobs succeeded.
- `code-review` (high) gave 10 findings, 8 fixed: (1) the default address became `http://localhost:3000/api`, so a build without `VITE_API_URL` would have called the visitor's own machine (now same-origin, as before); (8) with a relative API address the sockets had no proxy (now `/socket.io` in Vite); (2) the theme loaded twice per login, and a late answer could undo a fresh pick (once per session, the pick wins); (3) existing users' theme in localStorage was dropped (moved to the server once), and the layout waited for the theme before loading the notifications; (4) the logout kept the previous user's theme; (5) the task form reloaded all tasks twice after an unlock, and a failed reload reported a successful unlock as an error; (6) a failed save was silent; (7) `window.fetch`, `axios` and a bare `@/api` import passed the lint rule; (9) the calendar loaded all tasks twice on its first visit, and a dead branch in the document view. Kept: (10) the entity stores pass the API's answers through unchanged: the milestone asks for the layering, not for caching (the dashboard still reads `task-progress` twice). Not changed: composables such as `useChat` still import `api/` modules; the rule covers views and components, as the milestone asks.

**Learned (for later milestones):**
- A default URL baked into a build decides where every visitor's browser connects: keep it relative.
- A theme from the server shows only after its request; a dark-theme user sees light until then (decision Q8f moved it off the browser).

**Failed / open:**
- `components/tasks/TESTS_README.md:75` documents the api/ layer's own test with `apiClient`, the one line the Done-when grep still finds.

## 2026-11-10 – M26: Global search per thesis

**Done:**
- `searchStore` (T42, FA-52; T43, FA-53): users join the search through `userStore.fetchForSelection()` (`GET /users/for-chat`, the list the chat uses: names and usernames, no e-mail addresses), loaded once per session (also if that fails, without retrying on every focus; the logout forgets them), and the search goes on without them. The results come as groups in a fixed order: Projekte (matching top-level tasks, decision Q2), Aufgaben (the other matching tasks), Benutzer (by username or full name in either order), Notizen, Vorlagen; tasks match by title and description (no longer by status); at most 5 per group with "+N weitere" for the rest, empty groups left out (the old flat list had 10 in all).
- `components/layout/SearchResults.vue`: a listbox of named groups (`role=group` with its heading), options reachable with the arrow keys from the input (`role=combobox`), Enter picks, Escape and a click outside close. `searchStore.targetOf` leads a project or task to itself (`/tasks?task=<id>`, `TaskView` opens it, also when it is already open) and a user to a direct chat with them (`chatStore.openDirect`, `/chat?room=<id>`; `ChatView` follows a changed room).

**Verified:**
- Done when: `searchStore.spec.js` has a test for each category (projects, tasks, users, notes and templates) plus the order, the limit and the user list's loading and failure; `SearchResults.spec.js` is the grouped dropdown's component test (headings, results per group, the chosen result, nothing without results).
- Frontend: 402 tests (coverage thresholds included); lint, knip and the build pass. `act --action-offline-mode`: all four jobs succeeded.
- `code-review` (high) gave 10 findings, all fixed: (1) a user result opened the profile page, which shows the signed-in user's own data under the other id (now a direct chat); (2) a second pick on the same page stayed stale (the chat and the task list follow the address); (3) the dropdown's dark-mode rules (`:global(body.dark-mode) .x` in a scoped block) compiled to bare `body.dark-mode` rules that coloured the page (now unscoped and confined to `.search-results`; checked by compiling the styles); (4) no keyboard use and invalid ARIA; (5) a wrapped or empty user answer broke the whole search; (6) a project or task opened only the plain task list; (7) the per-group limit hid matches without saying so; (8) the user list was never reloaded after a logout; (9) status words filled the task groups, and "Nachname Vorname" found nobody; (10) the dropdown never closed on a click outside or Escape.

**Failed / open:**
- `LayoutView.vue` has the same scoped `:global(body.dark-mode) .x` rules for the user menu and the notifications (lines 256–432), outside the search; they colour the page in dark mode the same way.

## 2026-11-10 – M27: Grades view, password change, avatar, audit-log view, comments

**Done:**
- Grades (UC-13, UNUSED_CODE.md Planned): `GradesView` has the route `/grades` and a sidebar link for students; knip no longer ignores it.
- Password change (T47):
  - Backend: `POST /auth/change-password` takes `current_password` and `new_password` (7–32 characters). It answers 400 for a wrong current password or an account without one, and allows 3 tries a minute.
  - Like a reset, it ends all sessions. This session gets new tokens back, so it stays signed in.
  - Frontend: `SecurityTab`'s password form is wired up, with checks that the two new passwords match and have the right length.
- Audit log (T33, UC-32): the admin view `/admin/audit-log` (`AuditLogView`, `auditLogStore`) sits on `GET /tasks/activity`.
  - It filters by action and date and pages 50 entries at a time.
  - A deleted task appears by the text of its entry, marked "gelöscht".
  - Admins and superusers get the route and the sidebar link.
- Comments and grading remarks (T09, T74, decision Q16): `TaskComments` and `TaskGradeRemarks` sit in the task detail view (`TaskForm`) for an existing task.
  - They are outside the form, so each sends on its own. Both go through `taskCommentStore` and share their logic in `composables/useTaskThread.js`.
  - Comments mark an `@username`, rendered without `v-html`.
  - Grading remarks have a form for teachers only and stay hidden for a user who gets 403 (not a task member).
- Avatar (T47, decision Q8c):
  - Table `user_avatars(user_id PK, mime_type, data, updated_at)`, migration `20261110120000_user_avatars`, deleted with the user.
  - `PUT /users/me/avatar` takes an image of at most 1 MB, recognized by its content. PNG, JPEG, GIF, WebP and BMP are accepted, SVG is not. Multer stops at 1 MB with 413; a non-image gets 400.
  - `DELETE /users/me/avatar` removes it; `GET /users/:id/avatar` serves it.
  - The magic-byte check moved to `shared/` (`FileInspector` port, `MagicByteFileInspector`), because documents and avatars both use it and contexts don't import each other.
  - User responses name the picture as `profile_picture`, a path relative to the API's base URL with the change time as version, or null without a picture. This covers `/users`, `/users/:id`, `/users/for-chat`, `/users/profile` and the task members.
  - Frontend: `UserAvatar` shows the picture, or the initials without one, in the header, the task members and the profile. `AvatarEditor` on the own profile changes or removes it.

**Verified:**
- Done when:
  - Component tests: `GradesView`, `AuditLogView`, `SecurityTab`, `TaskComments`, `TaskGradeRemarks`, `TaskForm` (both sections), `TaskMembersList` (picture), `UserAvatar`, `AvatarEditor`, `UserProfileView`.
  - E2E: `password-change.e2e-spec.ts`, `avatar.e2e-spec.ts` (upload, served with token, named in user responses, rejected non-image, over 1 MB, without token, delete) and `task-comments.e2e-spec.ts` (comment with @mention, listed with author, mention mail in the outbox).
  - Non-admins get 403 on `GET /tasks/activity`: `task-management.e2e-spec.ts` (student and teacher).
- Backend: 690 unit tests and 169 E2E tests; lint (`--max-warnings 0`), depcruise and knip pass. `prisma migrate diff` from the migrated test database to the schema is empty.
- Frontend: 454 tests; lint, knip and the build pass.
- `act --action-offline-mode`: all four jobs succeeded.
- `code-review` (high) gave 10 findings:
  1. A new comment came back without its author and showed "Gelöschter Benutzer". `create` and `update` now include the author; the E2E checks it.
  2. The avatar route fell under the throttle (10 a minute per IP and route), so a list of members got 429s. It now skips the throttle.
  3. `POST /auth/set-new-password` still took any access token, which made the current-password check of the new endpoint pointless. `PasswordChangeGuard` now passes reset tokens only: the e-mail link and, since review M32, the Google reset path. An access token gets 401; the E2E pinned the old behavior and now checks the new one.
  4. Profile pictures were served without a token at counting ids, so anyone could download every pupil's photo. All avatar routes now need a token, and the frontend loads the pictures through the API client as object URLs (`avatarStore`, freed at logout).
  5. The security tab with the now working password form showed on other users' profiles but changed the signed-in user's own password. Security and notifications are on the own profile only.
  6. The picture cost a second `GET /users/profile` after a reload. `loadUser` takes it from its own answer.
  7. The audit log's pager sent filter inputs that hadn't been applied. It keeps the filter last sent.
  8. The avatar URL hard-coded the global prefix `/api`. It is now relative to the API's base URL, which the frontend's HTTP client adds, so no frontend helper has to remove a prefix. The `users` route name stays in `shared/application/profile-picture.ts`.
  9. The avatar select was copied four times. It is now `AVATAR_VERSION`, next to `withProfilePicture`.
  10. `TaskGradeRemarks` copied `TaskComments`' logic. That logic is now in `useTaskThread`; the templates and styles stay separate.

**Failed / open:**
- `GradeModal` has no form for grading remarks. Teachers write them in the task detail view, which step 5 allows ("from there or from `GradeModal`").
- `UserProfileView` keeps its name fields in localStorage (unchanged; T26-like). Another user's profile shows the initials, not their picture, because the view has no data for other users.

## 2026-11-10 – M35: Admin user management and Superuser system configuration

**Decisions:**
- The user decided I2: flags stay per permission, so the tab edits each role's set and each permission's flags.
- The user decided I3: role permissions count only through the role, with no copies. This replaces step 1b.
- Both are recorded in GOALS.md.

**Done:**
- User management (T75, UC-30, decision Q17): `AdminView` has a "Benutzerverwaltung" tab.
  - Create and edit go through `UserAccountForm`, on `POST`/`PATCH /users`. Edit sends only the changed fields.
  - Delete asks for confirmation, naming the ghost-user anonymization (M14). It isn't offered for the own account.
  - A new account gets the Student role, like a registration, in one unit of work. Since I3, roles are the only source of a user's permissions.
- Role changes in `AdminView` reload the list. They used to re-select the stale user, so a change showed only after a page reload.
- Superuser protection (review M35): only a Superuser grants or removes the Superuser role, or edits or deletes a Superuser's account. Anything else gets 403.
- Decision I3: `addRoleToUser` no longer copies the role's permissions into `user_permissions`.
  - `RolePermissionsService` and its repository are deleted.
  - `assignRoleWithPermissions` is renamed `assignRoleWithDetails` (it returns the role for the answer).
  - The header of `domain/role-permissions.ts` now says it is the seed default.
- System configuration (T77, UC-40, decisions Q18, A3, I2):
  - `PUT /roles/:id/permissions` takes `@Roles(SUPERUSER)` plus `manage_system` WRITE. It sets the role's whole permission set and, in the same transaction, the flags of the entries that carry flags. An entry without flags keeps the permission's own.
  - The answer is 404 for an unknown role and 400 for an unknown or repeated permission.
- Lock-out guard (`domain/system-configuration.ts`): returns 400 if a change would leave the Superuser role without what the configuration needs. That is `view_dashboard` R, `manage_users` R (the roles and permissions lists) and `manage_system` R+W. Because flags are global, this is checked for every role.
- `SystemConfiguration` tab: shown when any of the user's roles is Superuser, read from `GET /users/me/permissions`; the token names only the first role.
  - It lists every permission with an "assigned" box and R/W/X flags; the flags are locked for unassigned rows.
  - It sends flags only where they changed, and shows the server's refusal.

**Verified:**
- Done when: `admin-management.e2e-spec.ts` (11 tests) covers:
  - an admin creating, editing and deleting a user, and a student getting 403 on all three;
  - the Superuser adding and removing a Student permission, with the student's access changing at once;
  - a flag change for every role;
  - an Admin getting 403 on `PUT /roles/:id/permissions`;
  - the lock-out guard (400): `manage_system` missing or without W, `manage_users` or `view_dashboard` missing, and `view_dashboard` without R set through another role;
  - unknown permission or role, no copies at role assignment, the Superuser role and accounts out of an admin's reach, and a new account with the Student role.
- Component tests:
  - `AdminView.spec.js` covers both tabs: new account, edit, delete with confirmation, the delete report when the list fails to reload, no delete of the own account, and the tab only for a Superuser, even when Superuser isn't the first role.
  - `UserAccountForm.spec.js` and `SystemConfiguration.spec.js` cover the two new components.
- Backend: 699 unit tests and 180 E2E tests; lint, knip and depcruise pass.
- Frontend: 469 tests; lint, knip and the build pass.
- `act --action-offline-mode`: all four jobs succeeded.
- `code-review` (high) gave 10 findings; 9 were fixed and 1 stays by decision I3:
  1. An Admin could assign themselves the Superuser role and so reach the Superuser-only configuration.
  2. The lock-out guard protected only `manage_system`, so taking away `manage_users` or `view_dashboard` (also through global flags) locked the Superuser out of the tab.
  3. An Admin could change a Superuser's e-mail and take over the account through a password reset, or delete it.
  4. The edit form sent unchanged fields, so seeded accounts with short usernames couldn't be edited at all.
  5. The tab followed only the first role in the token.
  6. Copies made before M35 keep their permissions. This stays by decision I3; the tab's hint now says that direct permissions count in addition.
  7. Accounts created by an admin had no role and so no permissions.
  8. A deletion was reported as failed when only the reload failed.
  9. A stale screen wrote back old flags of every assigned permission. Only changed flags are sent, and the update skips equal values.
  10. Stale comments and a misleading name were left behind, and the entry type was declared three times. The comments and name are fixed, and one `RolePermissionEntry` in the port is shared by the service and the repository.

**Failed / open:**
- Direct grants that `addRoleToUser` copied before M35 stay in `user_permissions` (decision I3). In the dev seed, the direct grants are the deliberate, time-limited ones; `AdminView` lists them per user and can remove them.

## 2026-11-10 – M28: Shrink `CalendarView.vue` with `useCalendarUtils`

**Done:**
- Smoke test first (`views/CalendarView.spec.js`, 11 tests). It passed on the old view, then unchanged on the new one, apart from the store mock becoming reactive. It covers:
  - month, year (twelve months, a click opens one), week (from Monday, lessons, tasks under their day) and day view;
  - paging and "Heute", and opening a task;
  - drag-and-drop in the month and week views and onto the day view's next-day arrow, each keeping the task's time;
  - the refusal for a graded submission;
  - a saved task showing without a reload.
- `CalendarView.vue` went from 2,339 to 228 lines and keeps the loading, the navigation, the move and the task form. It has no local `getWeekStart`/`formatDate` left.
- `components/calendar/`:
  - `CalendarYearView`, `CalendarMonthView`, `CalendarWeekView` and `CalendarDayView`;
  - `CalendarLessonsLayer`, shared by week and day;
  - `timetable.js`: time slots, lesson position, priority colours, scrolling to 07:30;
  - `calendar.css`.
- `useCalendarUtils` is now used for the date math (problem 16, UNUSED_CODE.md Planned). It gains `weekdayIndex`, `shiftDateKey` and a shared `WEEKDAY_NAMES`.
- `useCalendarDragDrop` holds the drag state and the drops onto a day or a relative day; the view supplies the move. Each has its own tests.
- Styles:
  - Scoped styles don't reach into child components, so the 760 lines of scoped CSS moved to `calendar.css`, every rule prefixed with `.calendar-page`. The unscoped dark-mode block moved there too, also prefixed.
  - `TaskForm` renders outside the calendar root as `.calendar-task-modal`, so the calendar's rules don't reach into the form; its overlay and dark-mode rules follow it.
  - The two scoped modal rules that matched nothing in the template were dropped.
  - The old scoped `:global(body.dark-mode) .x` rules were dropped. They compiled to bare `body.dark-mode` rules: once the calendar had been visited, they gave the whole app in dark mode a border, an outline, 90 % opacity and its own background, and never styled the calendar (see M26).

**Verified:**
- Done when: `CalendarView.vue` has 228 lines with no local date helpers; `useCalendarUtils.test.js` passes (7 tests); the smoke test for the view switching exists.
- Browser check (Chromium through playwright-core, installed in the scratchpad only, against the test database `effsync_test`, never the dev database):
  - Screenshots of the old and the new `CalendarView` were pixel-identical in light mode for year, month, week, day and the task form opened from the calendar, and for the dark task form.
  - In dark mode the four views differ only by the 1px border around the page that one of the dropped body rules drew; the calendar itself is identical.
  - Real moves: month (12th → 14th, still there after a reload), week (by `DragEvent`s with a `DataTransfer`: 13th → 14th) and the day view's next-day arrow (14th → 15th). Every `PATCH` kept the time of day.
  - Playwright's own `dragTo` doesn't reach the week view's task row at the bottom of the scrolled timetable, in the old version as in the new.
- Frontend: 487 tests; lint, knip and the build pass.
- `act --action-offline-mode`: frontend, E2E and restore jobs succeeded. The backend job failed in "Setup Node" after 14 ms (the known act race, before any step of ours), and succeeded on its own rerun.
- `code-review` (high) gave 10 findings:
  1. The dark task form lost its styles outside the root. Fixed: its selectors now point at `.calendar-task-modal`, and the dark screenshot is identical.
  2. Dropping the body rules changes the app-wide dark look. Intended; the screenshots show only the border.
  3. The week view files tasks by the UTC date of their deadline. Left as it was (open below).
  4. The month and day views showed old data after a save. Fixed: `events` is now computed from the store's open tasks, and the move no longer patches a copy.
  5. An unparseable deadline moves to 12:00 instead of 08:00. Accepted; that can't happen with the store's ISO deadlines.
  6. A lesson time that isn't text fell back to 08:50 instead of 08:00. Fixed: `timeOfDay` returns 08:00 again.
  7. The dark block wasn't prefixed, and a header comment was stale. Both fixed.
  8. The day view's `taskStyle` worked from fields the entries don't have, so its `top` was always invalid. It now gives the static stacking styles; the result is the same.
  9. The weekday names existed four times. Now there is one `WEEKDAY_NAMES`, and the day view reuses `getWeekDays`.
  10. The week view filtered per day on every render. Now it computes once per day per data change, with no second sort of the lessons.

**Manual check (user, 2026-11-10) and fix:**
- Finding: only the month view showed tasks; week and day showed just the lessons. Both views had the tasks, out of sight, already before M28:
  - the week view put them in a row under the full 24-hour grid (1,440px), which opens scrolled to 07:30;
  - the day view put them absolutely at 00:00 at the top of the grid.
  - So T60 ("shows tasks by due date in month, week and day view") wasn't met in practice.
- Fix: the week and day views have a `.timetable-top` area above the scrolling grid, so it always stays visible.
  - It holds the day headers and a row "Aufgaben" with each day's tasks: time, unless midnight, and title, earliest first.
  - The cards are dragged from that row and dropped onto it (`CalendarTaskList`).
  - The day view takes the store's tasks like the week view, in priority colours. The positioning by an unknown time is gone, and so are the `.day-entries` rules.
- The week-view date bug is fixed: `tasksOnDay` files a task by the local date of its deadline, like the month view.
- Smoke tests: the week's tasks show with their time above the grid and not inside it; the day's task shows with its time; a task due shortly after local midnight lands on the same day in month and week.
- Browser check against the test database (a separate backend on 3001 and Vite on 5174, so the dev setup stayed untouched): the week and day views show their tasks in light and dark mode, and the columns of the top area and the grid line up to the pixel (`minmax(0, 1fr)` and the same `scrollbar-gutter`).
- Frontend: 489 tests; lint, knip and the build pass; the `act` frontend job succeeded.

**Second manual check (user, 2026-11-10):** the week and day views show their tasks in the row "Aufgaben" above the grid, and dragging works. M28 is ticked: Done when met.

## 2026-11-10 – Definition of done, part 1: the measurable criteria

The milestones are all ticked; the loop now goes through GOALS.md's Definition of done one item at a time (user's decision).

**Done:**
- `AppController`/`AppService` deleted: Nest's starter "Hello World!" on `GET /api`, which Swagger answers first, so it could never be reached (`app.e2e-spec.ts` documented that). With them goes the Swagger tag `app`. The `src/` root now holds only `main.ts`, `app.module.ts` and `app.setup.ts`, plus `contexts/` and `shared/`.

**Verified (ticked):**
- Architecture: every module under `src/contexts/*` or `src/shared/`; depcruise with 0 violations (304 modules), run in CI, as is `depcruise:contexts`.
- knip: no findings in backend or frontend; runs in both CI jobs.
- Coverage: backend overall 82.3 % lines. The per-file targets of `08_…:39-43` are `coverageThreshold`s (backend `package.json`) and vitest thresholds (frontend), which `npm run test:coverage` enforces in CI.
- ESLint: 0 errors in both projects with `no-unsafe-*` at `error` (M34); CI runs `lint:check` and `npm run build` for both.
- Role names: no string literal outside `domain/role-permissions.ts` and the seed; every `@Roles(...)` uses `RoleName` or the lists built from it (`STAFF_ROLES`, `PRIVILEGED_ROLES`).
- One axios instance (`api/httpClient.js`); the ESLint `no-restricted-imports` rule forbids `@/api`, `axios` and `fetch` in views and components (M25).
- No `localhost` in `frontend/src`; the addresses come from `config/urls.js`.
- localStorage holds the session (`authToken`, `refreshToken`, `userId`, `userRole`) and `calendarSettings`, the calendar's display hours in this browser, a UI convenience (decision D1).
- `JWT_SECRET`: the app doesn't start without it (`env.validation.ts`, tested), and there is no fallback secret (M9).

**Failed / open (next parts):**
- 11 backend spec files assert only `toBeDefined()`.
- `task-management` reads `user_permissions` itself (`prisma-task-member.repository.ts:87`), outside `identity-access/infrastructure`.
- `TaskService.update` has 118 lines (limit 80).
- Three `.vue` files over 800 lines: `DocumentView` 1,145, `AdminView` 1,110, `TaskForm` 1,104.
- THESIS_ALIGNMENT.md still shows the assessment before the milestones (68 claims Partial, Missing or Contradicted); the statuses need the evidence the milestones produced.
- Still to verify: the endpoint E2E per `08_…:112-138`, UNUSED_CODE.md, the `// THESIS:` flips and the list of API changes.
