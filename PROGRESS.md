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
