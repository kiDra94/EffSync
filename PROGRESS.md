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
