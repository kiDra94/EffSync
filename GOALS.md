# Refactoring Goals – EffSync

Analysis date: 2026-11-06 (branch `development`, commit `e484b02`). Updated the same day after the thesis alignment audit, and again as open questions are decided (see [Decisions log](#decisions-log)).

## Summary

EffSync is a school-oriented task management system (diploma thesis, HTL BULME Graz): a NestJS 11 + Prisma 7 + PostgreSQL backend (`backend/`, ~10k lines in `src/`) and a Vue 3 + Pinia + Vite frontend (`frontend/`, ~27k lines in `src/`), connected via REST (`/api`) and Socket.io. Features include nested tasks with rule-based auto-completion, task members, document submission and grading, chat, notifications, email and RBAC. The project builds (`tsc --noEmit` passes) and all unit tests pass, but the test suite is thin: 30 of 43 backend spec files contain only a single "should be defined" test, and backend line coverage is 37 %. Most of the business logic lives in two very large services (`tasks.service.ts` 1,002 lines, `documents.service.ts` 1,197 lines). In those services, role checks are duplicated, permission logic is copied inline and the completion logic exists twice. The frontend has several very large single-file components, two parallel axios clients and several files that nothing imports.

The refactor also **brings the code in line with the thesis**, which is the source of truth for what the system does. **Scope is the school version** (decision Q1); the company version is built separately later. [THESIS_ALIGNMENT.md](THESIS_ALIGNMENT.md) checks 129 claims: 56 Implemented, 41 Partial, 18 Missing, 9 Contradicted, 0 Ambiguous and 5 Deferred to the company version. The most serious mismatches:
- Chat-room membership can be changed without authorization (T02).
- Account deletion is a hard delete instead of the ghost-user anonymization (T10).
- Task templates call a stub endpoint (T110).
- `RolesGuard`, 2FA and refresh tokens are missing (T92, T31, T51).

The refactor also **restructures the backend into a domain-driven architecture**, which is what the thesis itself concludes (`thesis/content/11_Reflexion.tex:25-31`, `thesis/content/10_Ausblicke.tex:5-9`). Unused code is removed first, following [UNUSED_CODE.md](UNUSED_CODE.md).

### Current state (measured)

| Check | Command | Result |
|---|---|---|
| Backend unit tests | `cd backend && npx jest` | 43 suites, 130 tests, all pass |
| Backend coverage | `npx jest --coverage` | 37.5 % lines, 24.7 % functions |
| Backend e2e (read-only ones) | `npx jest --config test/jest-e2e.json test/app.e2e-spec.ts test/auth-throttle.e2e-spec.ts` | 3/3 pass, needs local Postgres; "worker failed to exit gracefully" (open handles) |
| Backend e2e `mitgliederverwaltung.e2e-spec.ts` | – | **not run**: creates users, permissions and tasks in the database `.env` points to; I didn't want to write test data into your local DB |
| Backend typecheck | `npx tsc --noEmit` | passes |
| Backend lint | `npx eslint "src/**/*.ts"` | 2,786 problems (441 errors, 2,345 warnings) |
| Frontend unit tests | `cd frontend && npx vitest run` | 10 files, 142 tests, all pass (noisy console output from expected 500 errors) |
| Frontend coverage | `npx vitest run --coverage` | 64.6 % lines of the files loaded by tests; `taskStore` 44.6 %, `httpClient` 63.2 %, `authStore` and `router` not loaded at all |
| Frontend lint | `npx eslint .` | 306 errors |
| Frontend e2e (Cypress) | – | not run (needs running app + browser) |
| CI (`.github/workflows/ci.yml`) | – | runs only `vitest` and `jest` unit tests; no lint, no build, no e2e |
| Thesis alignment | [THESIS_ALIGNMENT.md](THESIS_ALIGNMENT.md) | 129 claims: 56 Implemented, 41 Partial, 18 Missing, 9 Contradicted, 0 Ambiguous, 5 Deferred |

### Problems found (evidence)

Thesis-related findings (T01–T130) are in [THESIS_ALIGNMENT.md](THESIS_ALIGNMENT.md); unused code is in [UNUSED_CODE.md](UNUSED_CODE.md). The list below covers code-quality problems.

**Backend**

1. **Bug: search is ignored for non-teachers.** `backend/src/modules/tasks/tasks.service.ts:109` sets `where.OR` for the search term, then `:129` overwrites `where.OR` with the visibility filter. Students' `?search=` has no effect.
2. **A read endpoint writes to the DB, with N+1 queries.** `TasksService.findAll()` calls `recalculateTaskCompletionFromGrades()` for every returned task (`tasks.service.ts:191-208`). That function can `UPDATE` tasks (`:776`), and it runs 3–4 queries per task. The recalculation on read itself is thesis behavior (T119); the N+1 queries are the problem.
3. **Duplicated completion logic.** `TasksService.recalculateTaskCompletionFromGrades` (`tasks.service.ts:670-785`) and `DocumentsService.completeTaskIfAllParticipantsGraded` (`documents.service.ts:423-541`) are near-identical ~115-line copies.
4. **Role checks via hardcoded role-name strings, implemented 4+ times.** `tasks.service.ts:122-127` and `:151-161` (same check twice in one function), `documents.service.ts:185-286` (`normalizeRole`, `isTeacher`, `isStudentContext`, including German aliases such as "schueler"/"lehrer"), `documents.service.ts:288` (`getTeacherNotificationRecipients`). A `RoleName` enum already exists in `backend/src/contexts/identity-access/domain/role-permissions.ts` but these places don't use it.
5. **Permission check copied inline instead of using `PermissionsService`.** `TasksService.remove()` (`tasks.service.ts:463-528`) re-implements the flag and validity-window check with a magic `READ_FLAG = 4`, even though `PermissionsService` is injected into the same class (`:19`) and has `hasAnyPermission()`.
6. **Three authorization mechanisms, but only one in use.**
   - Used everywhere: `auth/guards/permissions.guard.ts` + `@Permissions()`.
   - Unused: `modules/permissions/permission.guard.ts` (`PermissionGuard`, `@RequirePermission`, `@RequireRole`, 0 % coverage).
   - Unused: `auth/guards/roles.guard.ts` + `@Roles()`, although the thesis describes it as active (T92).
7. **Empty scaffold modules.**
   - `generate_all.js` generated 10 modules that contain only an empty controller and service (17 lines each): `classes-teachers`, `document-shares`, `note-documents`, `notes-users`, `priorities`, `students`, `task-documents`, `teachers`, `user-permissions`, `user-roles`. All are registered in `app.module.ts`.
   - `templates` and `task-activity` are stub resources that shadow real routes (T110, T33).
8. **Insecure JWT fallback secret.** `auth/strategies/jwt.strategy.ts:13` falls back to `"your-secret-key-change-this-in-production"` while signing (`auth.module.ts:19`) uses `process.env.JWT_SECRET` without a fallback. `JWT_SECRET` is read directly from `process.env` in 5 places instead of `ConfigService` and is never validated at startup.
9. **User object in the redirect URL.** `auth/auth.controller.ts:50` puts the whole serialized `req.user` into the OAuth callback query string. It ends up in browser history and logs.
10. **God services.**
    - `documents.service.ts` (1,197 lines) mixes file validation (magic bytes, `:120`), path handling (`:332-357`), authorization (`:359-421`, `:583-688`), grading, notifications and UI mapping (`mapDocumentForUi`, `:557`).
    - `tasks.service.ts` mixes CRUD, tree traversal, locking, grading-based completion and websocket notifications.
11. **Weak tests.**
    - 30 of 43 spec files only assert `toBeDefined()`.
    - 0 % coverage on `email-cron.service.ts`, `metrics.service.ts`, `comments.service.ts`, `task-members.controller.ts`, `email-preferences.controller.ts` and `google.strategy.ts`.
    - `users.service.ts` is at 8 % and `websocket.gateway.ts` at 18 %.
    - `backend/test/task-members.service.spec.ts` matches neither jest config (unit `rootDir: src`, e2e regex `.e2e-spec.ts$`), so **it never runs**.
12. **Broken or unused tooling and dependencies.**
    - The `test:permissions` script points to `test-permissions.ts`, which doesn't exist.
    - `npm run lint` uses `--fix`, so it modifies files and can't be used as a check.
    - `uuid` is never imported. `passport-local` isn't imported either, but the thesis needs it (T116).
    - `console.log`/`console.error` appear 28 times in `src/` instead of Nest's `Logger`.
    - There are 42 uses of `any` / `as any`.

**Frontend**

13. **Two axios clients.** `frontend/src/api/httpClient.js` (baseURL `/api`, 401 → logout, 429 handling) and `frontend/src/api/index.js` (baseURL default `http://localhost:3000` **without** `/api`, no 401/429 handling, plus a dead `authApi` that calls `/login`, `/logout`, `/user/profile`). `api/emailPreferences.js` uses the second one. Backend URL fallbacks are also hardcoded in `stores/useSocket.js:11`, `views/LoginView.vue:56` and `views/ForgotPasswordView.vue:11`.
14. **Views bypass the API layer** (T79). `views/DashboardView.vue:7` imports `apiClient` directly, and `components/dashboard/StatusDistributionChart.vue:71` calls `fetch()`.
15. **Dead files (nothing imports them).**
   - `components/UserProfile.vue` (954 lines; the router uses `views/UserProfileView.vue`)
   - `views/GradesView.vue` (491 lines, no route; Planned, see M27)
   - `components/notifications/NotificationCenter.vue` (576 lines)
   - `components/DocumentUploadForm.vue`
   - `stores/userStore.js`, `stores/entities/calenderStore.js`, `stores/entities/documentStore.js`
   - `components/tasks/AddMemberDialog.vue` and `composables/useCalendarUtils.js` are only imported by their own tests.
16. **Duplicated calendar logic.** `views/CalendarView.vue` (2,342 lines, ~680 lines of script) defines its own `getWeekStart`/`formatDate` (`:451`, `:462`) instead of the tested `composables/useCalendarUtils.js`.
17. **Very large components.** `CalendarView.vue` 2,342 lines, `DocumentView.vue` 1,164, `TaskForm.vue` 1,034, `AdminView.vue` 985.
18. **Broken build script and unused dependencies.**
   - `npm run build` runs `vue-tsc`, which isn't installed, so the production build fails.
   - `@nestjs/swagger` (a backend library) is listed as a frontend dependency.
   - `uuid` and `happy-dom` are never used (the test env is `jsdom`).
19. **School structure is stored only in the browser** (T26). `views/ClassListView.vue`, `ClassDetail.vue`, `DepartmentView.vue` and `SchedulesView.vue` keep their data in localStorage (`effsync_classes`, …) instead of calling the existing backend APIs, and `ClassDetail.vue:35-42` shows hard-coded mock students and teachers. Subjects and rooms have no UI. Only `CalendarView.vue:75` (lesson slots) and the dashboard counts use the API.

## Target architecture (backend)

**Thesis basis.**
- `thesis/content/11_Reflexion.tex:27-31`:
  - The Table-Module pattern (`06_TechnologienUndSystemarchitektur.tex:90`) caused architectural weaknesses across the system.
  - The concrete symptom (`:29`): task create/update/delete and the matching `task_activity_log` entry are not one atomic transaction, because they are spread over separate modules and controllers.
  - A DDD-based architecture "hätte hier für das gesamte Backend eine bessere Alternative dargestellt" (`:31`). Modules should follow business domains and processes instead of tables.
  - One `TaskController` is responsible for all task operations, including the activity log in a shared transaction.
  - Task management is its own bounded context, with the `TaskController` as aggregate root that encapsulates all consistency rules.
- `thesis/content/10_Ausblicke.tex:7-9` makes this the next refactoring step ("strikt entlang von Domänengrenzen"). It adds that **comments and the activity log** belong in the task domain and the central `TaskController`.

The domains below follow the thesis's own grouping in `06_TechnologienUndSystemarchitektur.tex:146-153`. Contexts the thesis doesn't name are marked as such.

### Bounded contexts

| Context | Thesis basis | Takes over (today's modules / tables) |
|---|---|---|
| `identity-access` (the others depend on it) | "Benutzer und Rechte" (`06_…:149`); RBAC/ABAC (`06_…:198-207`) | `auth`, `users`, `roles`, `permissions`; tables `users`, `roles`, `permissions`, `user_roles`, `roles_permissions`, `user_permissions`, and the new `refresh_tokens`, `user_two_factor`, `user_avatars`, `user_settings` (decisions Q8b, Q8d, Q8c, Q8f); `JwtAuthGuard`, `LocalAuthGuard` (new, T116), `RolesGuard`, `PermissionsGuard`, `@Roles`, `@Permissions`, `role-permissions.config.ts` |
| `task-management` | "Aufgaben" (`06_…:150`); own bounded context (`11_…:31`); includes comments and activity log (`10_…:9`) | `tasks`, `task-members`, `task-templates`, `task-comments` (becomes `task_grade`, decision Q16), `task-activity-log`, real comments on the `comments` table, the new `tags`/`task_tags` (decision Q8e); rule engine (`task.evaluator.completion.ts`), locking, completion from grades; **one `TaskController`** for all task operations |
| `communication` | "Kommunikation" (`06_…:151`) | `chat-rooms`, `chat-messages`, the chat handlers of `websocket.gateway.ts`; tables `chat_rooms`, `chat_room_users`, `chat_messages` |
| `documents-notes` | "Dokumente und Notizen" (`06_…:152`) | `documents` (incl. grading, `task_documents`, `document_shares`), `notes` (`notes_users`, `note_documents`) |
| `school-organization` | not named in the thesis; the features are listed in `05_…:60` | `classes`, `departments`, `subjects`, `rooms`, `schedules`, `lesson-slots`; tables `students`, `teachers`, `classes_teachers` |
| `notifications` | not named in the thesis; behavior in `07_…:50-54`, `05_…:479-487` | `notifications`, `email` (service, preferences, cron), tables `email_preferences`, `email_logs` |
| `reporting` | not named in the thesis; dashboard in `05_…:430-461`, `06_…:70` | `metrics` (read-only queries for the dashboard) |
| `shared` (kernel, not a context) | – | Prisma client and the transaction/unit-of-work implementation, config validation, the Socket.io transport, logging |

### Layers per context

```
backend/src/contexts/<context>/
  domain/          entities, aggregates, value objects, domain services, repository interfaces (ports)
  application/     use cases, transaction boundary (unit of work), ports for other contexts;
                   index.ts = the only public entry point for other contexts
  infrastructure/  Prisma repositories and mappers, adapters (mail, realtime) implementing ports
  presentation/    controllers, DTOs, gateway handlers
backend/src/shared/{domain,application,infrastructure,presentation}/
```

- **Task aggregate.** The `Task` aggregate encapsulates the consistency rules the thesis names:
  - status ↔ progress coupling (T100)
  - no circular parents (`validateNoCircularReference`, T103)
  - rule evaluation (`evaluateCondition`, T106)
  - an activity-log entry for every create/update/delete (T32)
- **One transaction per task use case.** Each task use case in `application/` saves the aggregate and its activity-log entries in **one** unit of work (`prisma.$transaction`), which removes the inconsistency described in `11_…:29`.
- **Single entry point.** `TaskController` (`presentation/`) is the only HTTP entry point for task operations, including comments and the activity log (`10_…:9`). Decision Q6 reads "`TaskController` als aggregate root" (`11_…:31`) this way: the aggregate is the `Task` in `domain/`, the controller is its single entry point, and all task routes are task-scoped (`/tasks/:id/members`, `/tasks/:id/comments`, `/tasks/:id/grade-remarks`, `/tasks/:id/activity`, `/tasks/activity`, `/tasks/templates`).
- **Security.** Guards and decorators live in `identity-access/presentation/security/` and are re-exported through `shared/presentation/security/`, so every context's controllers can use them without importing another context's internals. Check order: token → role → permission (T97).

### Dependency rules

1. `domain/` imports nothing from `@nestjs/*`, `@prisma/*`, `prisma` or any other context. It may import only its own `domain/` and `shared/domain/`.
2. Layers point inward:
   - `presentation → application → domain`
   - `infrastructure → application | domain` (it implements ports)
   - `application` never imports `infrastructure` or `presentation`.
3. Contexts talk to each other **only through `application/`**: code in `contexts/A/` may import `contexts/B/application/index.ts` and nothing else from `contexts/B/`. Example: grading in `documents-notes` calls `task-management`'s `completeIfAllStudentsGraded`; `task-management` calls `notifications` to notify members.
4. There are no circular dependencies between contexts. `identity-access` depends on no other context.

**Enforcement in CI.**
- Rules 1–4 go into `backend/.dependency-cruiser.cjs` (rule names `domain-no-framework`, `layers-inward`, `context-via-application`, `no-circular`).
- A CI step runs `npx depcruise src --config .dependency-cruiser.cjs`.
- M10 adds the rules with severity `warn`, so violations are reported but the build passes. M34 switches them to `error`, so the build fails on any violation.
- `npx knip` runs next to it for unused files, exports and dependencies (from M5).

## Definition of done

The refactor is done when all of the following hold:

- [ ] `cd backend && npx jest`, `npm run test:e2e` and `cd frontend && npx vitest run` pass, in CI as well. Every characterization test from M1/M2 still passes. Tests marked `// THESIS: <claim ID>` were flipped in the milestone that fixed the claim; any other change is listed in PROGRESS.md with the reason.
- [ ] **Every descriptive claim in [THESIS_ALIGNMENT.md](THESIS_ALIGNMENT.md) has status Implemented.** Each one is verified by a test that names the claim ID, or by a manual check documented in PROGRESS.md (for UI, browser and performance claims). Ambiguous claims count once their open question is answered. Claims with status Deferred (company version, decision Q1; production operation, decision Q4) are excluded.
- [ ] **Every Delete item in [UNUSED_CODE.md](UNUSED_CODE.md) is gone, and every Planned item is implemented or listed as an open question.**
- [ ] **The backend follows the target architecture**: all modules live under `src/contexts/*` or `src/shared/`, and `npx depcruise src --config .dependency-cruiser.cjs` runs in CI with severity `error` and 0 violations.
- [ ] **`npx knip` reports no unused files, exports or dependencies in backend and frontend**, and runs in CI.
- [ ] Coverage per the thesis (`08_…:39-43`):
  - ≥ 90 % lines for `AuthService`, `JwtAuthGuard`, `LocalAuthGuard`, the task use cases/aggregate (thesis: `TaskService`), and the frontend auth store, task store and `httpClient`.
  - ≥ 75 % for the user and permission services and the frontend router guards.
  - Backend overall ≥ 60 %.
- [ ] Every endpoint listed in `08_…:112-138` has E2E tests for the happy path and the 400/401/403/404 paths (T121, T123).
- [ ] No spec file whose only assertion is `toBeDefined()`. All spec files are picked up by a jest config.
- [ ] `npx eslint` reports 0 errors in `backend/src` and `frontend/src`, with the `no-unsafe-*` rules back at `error` everywhere (decision Q13), and CI runs lint and `npm run build` for both projects.
- [ ] No source file in `backend/src` over 500 lines, no backend method over 80 lines.
- [ ] No `.vue` file over 800 lines (including style).
- [ ] Role names appear as string literals only in `contexts/identity-access/domain/role-permissions.ts` (the `RoleName` enum) and `prisma/seed.ts`. `@Roles(...)` uses the enum.
- [ ] Permission checks go only through `PermissionsService` / `PermissionsGuard` / `RolesGuard`: no `user_permissions` or `roles_permissions` queries outside `identity-access/infrastructure`.
- [ ] Exactly one axios instance in `frontend/src/api/`; no `apiClient` import, no `fetch(` (T79) and no import from `@/api/` (T80, decision Q19) in `views/` or `components/`, enforced by an ESLint `no-restricted-imports` rule.
- [ ] No hardcoded `localhost` URLs in `frontend/src` outside one config module.
- [ ] No domain data in localStorage: it holds only the auth tokens and per-browser UI conveniences (decision D1).
- [ ] Backend fails to start when `JWT_SECRET` is missing, and there is no fallback secret in the code.
- [ ] API routes, request/response shapes and the Prisma schema change only where a milestone implements a thesis claim or an answered open question requires it. Every such change is listed in PROGRESS.md.

## Constraints

- **The thesis is the single source of truth for what the system does**: features, behavior, roles and permissions, security mechanisms, testing setup and tooling. Where code and thesis differ, the code is changed (see THESIS_ALIGNMENT.md).
- **Scope: the school version only** (decision Q1). The company version (`05_…:67-78`) is a separate build later. Its roles (Manager, Member, Viewer), teams and detailed reporting are not implemented and not prepared for (claims T25, T28, T30, T35 are Deferred). 2FA, the audit log, the GDPR ghost user and the dashboard trends (FA-33, decision A4) stay in scope.
- **`thesis/` is read-only.** It is submitted and graded and is never edited.
- **`documents/` is internal planning material, not a source of truth.** Outdated lines there may be updated or left alone; they never justify keeping code.
- **Mechanisms named in the thesis keep existing and keep their names**, wherever they live after the restructuring. This covers:
  - `JwtAuthGuard`, `LocalAuthGuard`, `RolesGuard`, `@Roles`, `PermissionsGuard`, `@Permissions`
  - `validateNoCircularReference`, `collectDescendants`, `findeOneWithSubtasks`, `buildTree`, `evaluateCondition` (in `task.evaluator.completion.ts`)
  - `assertIsCreator`, `TaskController`, `RuleBuilder`, `useTaskFilters`
  - the `npm run test`, `test:e2e`, `test:coverage` scripts and `test/jest-e2e.json`
- **REST API contract stays the same**: routes under `/api`, HTTP methods, request DTOs and response shapes. The exceptions are thesis claims, which may add endpoints (refresh, logout, password reset, 2FA, password change) and change authorization outcomes (T02, T54); the endpoints added by recorded decisions (`/users/me/settings`, `/users/me/avatar`, `/users/:id/avatar`, `/tasks/:id/grade-remarks`, `/tasks/activity`, `PUT /roles/:id/permissions`); and the broken routes the audit found (T110, T130, T33). Approved route moves: the task sub-resources move under `/tasks` (decision Q6, M15) and the chat routes move to `/chat-rooms` (decision Q6/T88, M6). Each move changes the frontend in the same milestone and is listed in PROGRESS.md.
- **Prisma schema unchanged, except for the approved changes below.** Each one comes from a thesis claim or a recorded decision. Any further change goes under Open questions first. **Approved schema changes:**
  - rename `task_comments` → `task_grade`, with a data migration that moves today's rows into `comments` (decision Q16, M15)
  - new table `refresh_tokens(id, user_id, token_hash, expires_at, revoked_at)` (decision Q8b, M12)
  - new table `user_two_factor(user_id PK, secret_encrypted, enabled_at)` (decision Q8d, M32)
  - new table `user_avatars(user_id PK, mime_type, data, updated_at)` (decision Q8c, M27)
  - new tables `tags(tag_id, name UNIQUE)` and `task_tags(task_id, tag_id)` (decision Q8e, M18)
  - new table `user_settings(user_id PK, theme)` (decision Q8f, M25)
  - `@@index` on the foreign-key columns used in joins and filters, index-only (decision Q8h, M30)
  - `tasks.created_by` becomes `NOT NULL`, after moving NULL rows to the ghost user 0 (decision Q20, M33)
  - data only, no schema change: the priorities are reduced to four, keeping what users selected (decision Q15, M18) Seed data may change where a claim requires it: ghost user T10, priorities T58.
- **WebSocket event names and payloads unchanged.** New recipients or events are added only where a claim requires them (T44, T107).
- **Observable behavior unchanged, except where THESIS_ALIGNMENT.md shows a Partial, Missing or Contradicted claim, or a recorded decision changes it** (e.g. Q14 creator-only adding, Q16 comment storage, Q10 alias removal). Those are fixed deliberately, each in its own milestone and with a test. The confirmed search bug (problem 1) is treated the same way.
- **Unused code is deleted, not kept.** Git history is the archive. This applies to files, modules, exports, methods, DTOs, dependencies and scripts. Commented-out code is also removed. Planned items are implemented instead (decision 4). Where implementing one would duplicate an existing feature the thesis doesn't describe separately, it goes under Open questions (e.g. the `comments` module).
- **Key dependencies stay**: NestJS 11, Prisma 7, Vue 3, Pinia, Bootstrap 5, Socket.io, and `passport-local` (T116). There are no framework swaps and no TypeScript migration of the frontend. New dependencies only where a goal needs them: `dependency-cruiser`, `knip`, a TOTP library (M32), a load-test tool (M30).
- **UI text language stays German.** No visual redesign beyond what a thesis claim requires (e.g. the dashboard charts T37, T38, T40).
- **Seed data and demo login** (`adminadmin` / `password123`) keep working (decision B1): needed for the thesis demo and the E2E tests. The README states that the seed is for development, demos and tests only, never for production.
- **Code comments are English** (decision B2). M5 translates all German comments in `backend/src` and `frontend/src` in one comment-only commit, after the dead code is gone. UI text stays German.
- **Response shape of `GET /tasks`** stays (`data`, `meta.total`, `page`, `limit`, `totalPages`), but for students the values become correct (decision B3, M17): today `meta.total` counts only the loaded page plus its descendants (`tasks.service.ts:171-179`, `:209-217`). No frontend code reads `meta`.

## Milestones

Rules for all milestones:
- **Tests first (L2).** Write or adjust the test before changing the code.
- **Characterization tests pin current behavior.** Where that behavior contradicts the thesis, the test is marked `// THESIS: <claim ID>` and flipped in the milestone that fixes the claim.
- **Order of the DDD work.** No DDD migration milestone (M11 and later migration milestones) starts before M1 and M2 are done. Dead code is removed (M5) before the migration starts.
- **Lint per context (decision Q13).** Every migration milestone (M11, M15, M19, M20, M22, M23, M24) brings its context to 0 `no-unsafe-*` findings, mostly by replacing untyped Prisma results with typed repositories and mappers, and sets those rules back to `error` for its folder in the ESLint config. That is part of its Done when.
- **Parallel frontend work.** The frontend milestones M25–M28 and M35 can run in parallel with M10–M24. Where one of their steps needs a backend endpoint or table (M25: `user_settings`; M27: password change, `user_avatars`; M27 steps 3–5: M15's routes), that step is built in the owning context and waits until that context is migrated (M11 for `identity-access`, M15 for `task-management`).

### Foundation

- [x] **M1: Characterization tests for tasks and documents**
  - Why: the two largest services (`tasks.service.ts` 35 % covered, `documents.service.ts` 59 %) are the main refactor targets and contain the authorization rules. Without tests, the later milestones can't be verified.
  - Scope:
    - `TasksService`:
      - `findAll`: teacher vs. student visibility, descendants, search (mark the search bug `// BUG (problem 1)`)
      - `findOne`: read-time recalculation (T119)
      - `update`: locked task; circular parent → 400 (T01, T103); cascade COMPLETED; COMPLETED with progress < 100, marked `// THESIS: T100`
      - `remove`: creator vs. permission vs. forbidden; subtasks present (T108); log entries deleted, marked `// THESIS: T32`
      - `checkAndAutoComplete`: recipients, marked `// THESIS: T107`
      - `recalculateTaskCompletionFromGrades`
    - `DocumentsService`: `findAll`/`findOne` access rules, `grade`, `remove`, `completeTaskIfAllParticipantsGraded`.
    - Use mocked Prisma, like `task-members.service.spec.ts`.
  - Done when: `npx jest --coverage` shows ≥ 70 % lines for both files, all tests pass, and every thesis contradiction touched has its `// THESIS:` marker.
  - Risk: low. Only test files are added.

- [x] **M2: Characterization tests for permissions, task members, users, auth and chat rooms**
  - Why: `permissions.service.ts` (68 %), `users.service.ts` (8 %), `task-members.service.ts` (44 %), the `PermissionsGuard` and the chat-room controller back the RBAC that M6–M9 change. `backend/test/task-members.service.spec.ts` never runs (T127, UNUSED_CODE.md: Keep and move).
  - Done when:
    - The orphaned spec is moved under `src/` and runs, merged with the existing one.
    - `PermissionsGuard` has tests for the `a|b` OR syntax, AND across entries and a missing user.
    - `hasAnyPermission` has tests for the validity window and the flag bitmask.
    - Chat-room controller tests pin today's unauthenticated join/leave/add via `POST /:id`, `DELETE /:id`, `POST /:id/members`, marked `// THESIS: T02`.
    - `users.remove` pins the hard delete, marked `// THESIS: T10`.
    - Auth tests pin bcrypt cost 10 (`// THESIS: T50`) and username-only login (`// THESIS: T49`).
    - `users.service.ts` ≥ 60 %, `permissions.service.ts` ≥ 80 %.
  - Risk: low. Only test files and jest config change.

- [x] **M3: Automated E2E setup with a separate test database and `test-seed.ts`**
  - Why: T122 (`08_…:105`): before the API suite the DB is reset with `prisma migrate reset --force` and refilled from `test-seed.ts`, automated through the Jest config. Today `test/jest-e2e.json` has no setup, `prisma/test-seed.ts` is unused (UNUSED_CODE.md: Planned/Keep), and `mitgliederverwaltung.e2e-spec.ts` writes to the dev DB (T04, T126).
  - Steps:
    1. Add `.env.test` with its own `DATABASE_URL`.
    2. Add a Jest `globalSetup` in `test/jest-e2e.json` that runs `prisma migrate reset --force` and seeds via `prisma/test-seed.ts`.
    3. Give the E2E test app the same global prefix and pipes as `main.ts`, so real routes are tested (T130).
    4. Fix the open-handle warning.
    5. Add an E2E job with a Postgres service container to `ci.yml`.
    6. State in the README that `seed.ts` and `test-seed.ts`, including the demo login `adminadmin` / `password123`, are for development, demos and tests only (decision B1).
  - Done when: `npm run test:e2e` runs all 3 E2E files twice in a row with identical results and never touches the dev DB. The CI E2E job is green; `mitgliederverwaltung` stays red only for documented thesis gaps (T130), which are marked `// THESIS:`.
  - Risk: medium. `mitgliederverwaltung.e2e-spec.ts` has never run against the real prefix and may need fixes.

- [x] **M4: Make lint and build usable and add them to CI**
  - Why: `npm run lint` auto-fixes files and reports 441 backend and 306 frontend errors. Frontend `npm run build` fails (`vue-tsc` missing). The thesis says CI runs tests **and builds** (T22). Per decision Q4 this CI also fulfils the "CI/CD-Pipeline" of T17; the CD part is the deployment, which is future work (F1).
  - Steps:
    1. Add `lint:check` scripts without `--fix`.
    2. Fix the frontend build by removing `vue-tsc` from the `build` script (`build` = `vite build`, decision Q11).
    3. Run the auto-fixable lint/prettier fixes in one formatting-only commit.
    4. Lint strictness (decision Q13):
       - Frontend: add the Vitest and Cypress globals to the ESLint config for test and Cypress files (273 of the 306 errors are `cy`, `it`, `describe`, `expect` …), then fix the remaining ~33 errors. The 4 `no-undef` hits in source files (e.g. `showModal`, `selectedStatusName`) are checked as possible bugs, each with a test if it is one.
       - Backend: set `@typescript-eslint/no-unsafe-member-access`, `no-unsafe-assignment`, `no-unsafe-return` and `no-unsafe-enum-comparison` to `warn` for now (402 of the 441 errors), and fix all other errors (`unbound-method`, `ban-ts-comment`, `require-await` …).
    5. Add `lint:check` and `build` steps for both projects to `ci.yml`.
  - Done when: `npm run lint:check` and `npm run build` exit 0 in both projects, the `no-unsafe-*` warning count is recorded in PROGRESS.md as the baseline, and CI is green with the new steps.
  - Risk: medium. The mass formatting commit touches most files; it is a separate commit so that `git blame` can skip it (`.git-blame-ignore-revs`). No coordination with Ereny is needed (decision Q12).

- [x] **M5: Remove unused code**
  - Why: UNUSED_CODE.md. No effort should go into migrating code that gets deleted.
  - Scope: **every item with recommendation "Delete" in [UNUSED_CODE.md](UNUSED_CODE.md)**, including the newly found ones:
    - the stub modules `templates` and `task-activity`, with `frontend/src/api/taskTemplates.js` repointed to `/task-templates` in the same change. This fixes T110's endpoint and un-shadows T33's API.
    - `api/index.js`, with `api/emailPreferences.js` repointed to `httpClient.js` in the same change.
    - the unregistered `comments` module (decision Q16, now also recorded in UNUSED_CODE.md). The `comments` table stays: M15 rebuilds real comments on it.
  - Exceptions: `passport-local` stays (T116). `thesis/content/04_DigitalerWorkflosMitGithub.tex` stays, because `thesis/` is read-only (decision 3). Items marked Keep or Planned stay (Planned items are implemented in M3, M7, M27, M28).
  - Add `knip` configs for backend and frontend and a CI step.
  - Translate all German code comments to English in one comment-only commit after the deletions (decision B2), and add that commit and M4's formatting commit to `.git-blame-ignore-revs`. UI strings and German identifiers in data (e.g. seed texts) stay.
  - Done when:
    - `tsc --noEmit`, `npm run build` and all tests pass.
    - `GET /api-json` lists the same routes as before, minus the stub routes `/templates` and `/task-activity`, which now resolve to the real controllers.
    - A manual click-through of all router routes shows no missing component.
    - `npx knip` reports nothing in either project, apart from the Planned items not yet wired, which are listed as knip ignores with a pointer to their milestone.
    - The translation commit is comment-only: backend `tsc --removeComments` output and the minified frontend `vite build` bundle are byte-identical before and after it.
  - Risk: low. Every removed item has 0 references, checked by grep. The two route fixes are the only behavior changes, and both are intended. The translation commit is large but verified as comment-only.

### Security alignment (before the restructuring, because these are exploitable today)

- [x] **M6: Chat-room authorization**
  - Why: T02, T114, T96, T128.
    - `POST /chat/rooms/:id` and `POST /chat/rooms/:id/members` let anyone add anyone to any room.
    - `DELETE /chat/rooms/:id` (`leaveRoom`, `chat-rooms.controller.ts:48`) removes any user named in the request body, and it shadows the creator-checked `deleteRoom` (`:60`).
    - `findRoomsByUser` also lists rooms the user has left.
  - Steps:
    1. Leaving and joining use the authenticated user, not a body field.
    2. Only the creator may add members to a group room (`assertIsCreator`, otherwise 403; decision Q14). The REST self-join `POST /:id` for group rooms is removed; the Socket.io `joinRoom` in `ChatView` is unaffected.
    3. Removing others requires `assertIsCreator`.
    4. Give `deleteRoom` and `leaveRoom` distinct routes, with the route change listed in PROGRESS.md.
    5. Filter rooms by `left_at: null`.
    6. Rename the chat prefixes `chat/rooms` and `chat` to `/chat-rooms` (T88, decision Q6/T88): `/chat-rooms`, `/chat-rooms/:id/messages`, and the message edit/delete routes under the same prefix. `PATCH` stays.
  - Done when: the M2 `// THESIS: T02` tests are flipped and unauthorized attempts get 403. `GET /api-json` has no `/chat/` route left. E2E tests cover leave, kick by the creator, kick by a non-creator (403), add by the creator, and add by a non-creator member (403).
  - Risk: medium. The frontend `chatStore` and `api/chat.js:4-5` call these routes and have to change in the same milestone.

- [x] **M7: `RolesGuard` and role checks per thesis (+ search bug)**
  - Why:
    - T92/T97: `RolesGuard` + `@Roles(...)` and the check order token → role → permission (UNUSED_CODE.md: Planned).
    - Problem 4: role-name checks duplicated in `tasks.service.ts:122`, `:151` and `documents.service.ts:185-286`, `:288`.
    - Problem 1: search bug.
  - Steps:
    1. Apply `RolesGuard` with `@Roles(RoleName.…)` on the endpoints that are role-restricted today through inline checks.
    2. For service-level decisions (visibility, recipients), use one role query based on `PermissionsService.hasRole()` and the `RoleName` enum instead of a new helper.
    3. Replace all copies, and remove the German role aliases (decision Q10): `normalizeRole` in `documents.service.ts:185-196` and the copy in `frontend/src/views/DocumentView.vue:277-279`. `frontend/mockdb.json:66-80` gets the English role names (Admin, Teacher, Student), so the json-server mock matches the backend.
    4. Combine the search and visibility filters with `AND: [...]`.
  - Done when:
    - The M1 search test is flipped.
    - `grep -rnE "'(Teacher|Student|Admin|Superuser)'" backend/src/modules` hits nothing.
    - A guard-order test shows 401 (no token) before 403 (role) before 403 (permission).
    - `grep -rniE "schueler|schuler|lehrer|dozent|'administrator'" backend/src frontend/src frontend/mockdb.json` finds no role alias (UI labels such as the "Lehrer" tab text don't count).
    - All tests pass.
  - First step of the milestone (decisions Q10, C1): run `SELECT name FROM roles;` on every database in use and record the result in PROGRESS.md. The aliases are removed only if every result shows English role names; a database with German names first gets a one-off rename to the English names.
  - Risk: medium. Changing role checks can lock users out; the guard-order and visibility tests cover it.

- [x] **M8: Permission flags and explicit permissions**
  - Why:
    - T94: `PermissionsGuard` always checks `READ` (`permissions.guard.ts:63`).
    - T54/T72: many endpoints use `@Permissions()` without arguments, so e.g. `POST /tasks` never returns 403.
    - Problem 5: `TasksService.remove()` duplicates the permission logic.
  - Steps:
    1. Give `@Permissions()` an optional required flag (`READ`/`WRITE`/`EXECUTE`). This is the one idea worth keeping from the deleted `PermissionGuard`.
    2. Give every endpoint the permission its role config implies (e.g. `create_tasks` on `POST /tasks`), with a table in PROGRESS.md.
    3. Route `remove()` through `permissionsService.hasAnyPermission`.
  - Done when: every `@Permissions()` call has at least one argument (checked by grep), flag tests exist, the M1 `remove` tests pass unchanged, and E2E covers 403 for `POST /tasks` without `create_tasks`.
  - Risk: medium. Tightening permissions can lock out seeded users, so check the seed against the new table.

- [x] **M9: Login, hashing and secrets per thesis**
  - Why:
    - T116: `LocalAuthGuard` with `passport-local`.
    - T49: login with username or e-mail.
    - T50: bcrypt cost factor 12.
    - T14 and problem 8: secrets.
    - Problem 9: the user object in the OAuth redirect URL.
  - Steps:
    1. Add `LocalStrategy` + `LocalAuthGuard` on `POST /auth/login`, accepting username or e-mail.
    2. Use cost 12 in `auth.service.ts:15`, `:96`, `users.service.ts:16` and the seed. Existing hashes stay valid.
    3. Read `JWT_SECRET` through `ConfigService` in one place.
    4. Add `ConfigModule.forRoot({ validate })` requiring `JWT_SECRET` and `DATABASE_URL`.
    5. Remove the fallback in `jwt.strategy.ts:13`.
    6. OAuth callback (decision Q9): drop `?user=` and pass the token in the URL fragment (`/auth-callback#token=…`). `AuthCallbackView.vue` reads the fragment, removes it from the address bar and loads the user from `GET /auth/profile`.
    7. CSRF by design (T13, decision Q3): document in the README and in the Swagger security description that authentication uses only the bearer header, no auth cookies, and CORS limited to `FRONTEND_URL`.
  - Done when:
    - The M2 `// THESIS: T49/T50` tests are flipped.
    - Starting without `JWT_SECRET` exits with a clear error.
    - `grep -rn "process.env.JWT_SECRET" backend/src` hits at most the config module.
    - Login works with both username and e-mail (E2E).
    - The Google callback redirect contains no query parameters, and `AuthCallbackView` has a Vitest test for the fragment and profile flow.
    - E2E tests marked `// THESIS: T13` show that no auth endpoint (login, Google callback, and later refresh/logout from M12) sends `Set-Cookie`, and that a preflight from a foreign origin gets no `Access-Control-Allow-Origin`.
  - Risk: medium. The login DTO changes for the frontend (`LoginView.vue`), so both change together.

### Domain-driven restructuring and thesis alignment per context

- [x] **M10: Context skeleton and dependency rules (warn mode)**
  - Why: L1. Sets up the target architecture before anything moves.
  - Steps:
    1. Create `src/contexts/<context>/{domain,application,infrastructure,presentation}` for the seven contexts, plus `src/shared/`.
    2. Move `PrismaModule` and config validation to `shared/infrastructure`.
    3. Add a unit-of-work abstraction (`shared/application`) implemented with `prisma.$transaction`.
    4. Add `dependency-cruiser` with the four rules at severity `warn`, and a CI step.
    5. Record the baseline violation count in PROGRESS.md.
  - Done when: `npx depcruise src --config .dependency-cruiser.cjs` runs in CI, the build is green, and the baseline is recorded.
  - Risk: low. Nothing moves yet.

- [x] **M11: Migrate `identity-access`**
  - Why: L1. All other contexts depend on authentication and authorization, so this context goes first.
  - Scope: `auth`, `users`, `roles`, `permissions`; the guards and decorators go to `identity-access/presentation/security/` and are re-exported via `shared/presentation/security/`.
  - Done when: these modules live only under `contexts/identity-access`, it has 0 dependency-cruiser violations, all M2 tests pass unchanged, and `GET /api-json` is unchanged.
  - Risk: medium. Every controller imports the guards, so the re-export path must be stable before the other contexts move.

- [x] **M12: Token model per thesis: access, refresh, logout**
  - Why: T51 (access token 15 min, refresh token 7 days, `05_…:550-551`) and T123 (`/api/auth/logout`, `08_…:123`).
  - Steps:
    1. Issue a 15-minute access token plus a 7-day refresh token.
    2. Add `POST /auth/refresh` and `POST /auth/logout`.
    3. In the frontend `httpClient.js`, on 401 try a refresh once, then log out.
    4. Store refresh tokens in the new `refresh_tokens` table (decision Q8b): only the hash is stored, each refresh rotates the token (old row revoked, new row issued), and logout revokes the current session's row. Login, the Google callback (fragment, decision Q9) and later the 2FA login (M32) all issue both tokens.
    5. Tokens stay out of cookies and are sent as bearer header, as today.
  - Done when: E2E covers login → refresh → logout, an expired access token returns 401, a revoked or already-rotated refresh token returns 401, logout on one session leaves another session working, and the frontend refresh is tested in Vitest.
  - Risk: medium. It changes session behavior for every user, and the WebSocket JWT (`websocket.module.ts:13`) has to follow the same lifetime. Additive schema change (approved, Q8b); `seed.ts` and `test-seed.ts` clear the table.

- [x] **M13: Password reset by e-mail**
  - Why: T52. `ForgotPasswordView` posts to `/auth/forgot-password`, which doesn't exist; reset works only via Google.
  - Steps:
    1. Add `POST /auth/forgot-password`, which sends a reset link through the existing `EmailService`. It always answers 204, so it doesn't reveal whether an e-mail exists.
    2. The link carries a signed JWT (purpose `reset`, 30 min), signed with `JWT_SECRET` plus the user's current password hash, so it stops working once the password has changed (decision Q8a, no schema change).
    3. Accept the token in `set-new-password`.
    4. Keep the Google reset path.
    5. Found in M11: `GoogleStrategy` looks an account up by `username` = the Google e-mail and otherwise creates a new user, so a local account whose username differs from its e-mail collides on the unique `email` and the callback fails with 500. Look accounts up by `google_id`, then by e-mail, and move the user provisioning (with the default role) from the strategy into `AuthService` behind `UserRepository`, so registration and Google sign-in share one rule.
    6. Found in M12: setting a new password (reset link or Google reset) leaves the user's refresh tokens active, so a stolen session keeps refreshing. Revoke all of the user's sessions in `refresh_tokens` when the password changes.
  - Done when: an E2E test requests a reset, reads the token from the test mail transport and sets a new password; reusing the same link afterwards and using an expired link both return 401; a refresh token issued before the password change returns 401 afterwards; the frontend flow works against the real backend.
  - Risk: low–medium. No schema change. `set-new-password` must tell a reset token apart from a normal access token by its purpose claim.

- [x] **M14: Ghost-user anonymization on account deletion (DSGVO)**
  - Why: T10 (`03_…:295-299`). Deleting an account must anonymize instead of hard-deleting (per-user rows in `refresh_tokens`, `user_settings`, `user_avatars` and `user_two_factor` are deleted with the personal record; a milestone that adds one of these tables after M14 extends the deletion and its test): messages are reassigned to a ghost user with `user_id 0`, which the seed creates.
  - Steps:
    1. Seed user 0 (and `test-seed.ts`).
    2. Make `users.remove` reassign the user's `chat_messages`, plus the task authorship, `comments` and `task_grade` rows that `03_…:295` covers ("aufgabenbezogene Chats und Tasks"), to user 0 in one transaction, then delete the personal record.
  - Done when: the M2 `// THESIS: T10` test is flipped, and an E2E test deletes a user with messages and shows the chat history intact under the ghost user.
  - Risk: medium. FK rules (`NoAction`) on several tables have to be checked; if one needs a schema change, it goes under Open questions first.

- [x] **M15: Migrate `task-management` (L1 core)**
  - Why: `11_…:29-31`, `10_…:9`, T32. This is the thesis's central example.
  - Steps:
    1. Create the `Task` aggregate in `domain/`, with `validateNoCircularReference`, `buildTree`, `evaluateCondition` and the status rules.
    2. Write task use cases in `application/` that save the task **and** its activity-log entry in one unit of work. Deletes are logged too (decision Q8g, no schema change): in the delete transaction, write a "deleted" entry containing the task title, set `task_id = null` on all of the task's log rows, then delete the task.
    3. Add **one `TaskController`** (decision Q6) with task-scoped routes:
       - `/tasks`, `/tasks/:id` (unchanged)
       - `/tasks/:id/members` (fixes T130's `/api/api/…`)
       - `/tasks/:id/comments` (comments)
       - `/tasks/:id/grade-remarks` (teacher grading remarks)
       - `/tasks/:id/activity` (a task's activity log)
       - `/tasks/activity` (admin-only list of all entries, including those of deleted tasks, paginated and filterable by user, action and period; T33, UC-32, decision A2)
       - `/tasks/templates`
       - `/tasks/activity` and `/tasks/templates` are declared before `/tasks/:id`.
       The prefixes `/task-comments`, `/task-activity`, `/task-templates` and `api/tasks/:taskId/members` are removed. `frontend/src/api/taskTemplates.js` and `api/taskMembers.js` change in the same milestone; the route table goes into PROGRESS.md.
    4. Comments and grading remarks (decision Q16):
       1. Migration: rename `task_comments` → `task_grade`, copy its existing rows into `comments` (`user_id` → `created_by`, `text` → `content`), then remove them from `task_grade`.
       2. Comment use cases on `comments`, including the @mention mail moved from `task-comments.service.ts` (T09).
       3. `task_grade` use cases: teachers write grading remarks on a task (same teacher check as `canGradeDocument`), task members read them. The grade and the per-submission feedback stay on `documents`.
       4. Deleting a task deletes its comments and grading remarks, as it deletes `task_comments` today.
       5. Update `seed.ts` and `test-seed.ts`.
    5. Take over the remaining `task-members`, `task-templates` and `task-activity-log` code into the context and remove the old modules.
    6. Found in M14: `PrismaUserRepository.anonymizeAndDelete` (identity-access) writes the task tables directly (`tasks`, `comments`, `task_comments`, `task_activity_log`, `task_templates`). Move that part behind an account-deletion port that task-management implements and identity-access calls inside the same unit of work, so rule 4 holds. M19 (documents, notes), M20 (chat) and M22 (teachers, students, classes) do the same for their tables.
  - Done when:
    - The task code lives only under `contexts/task-management`, with 0 dependency-cruiser violations.
    - A test makes the activity-log write fail and shows the task change rolled back.
    - The `// THESIS: T32` tests are flipped, and a test shows the "deleted" entry and the kept log rows after a task delete.
    - All M1 task tests pass, and the @mention tests from `task-comments.service.spec.ts` pass against the new comment use case.
    - After `migrate reset` with seed, `comments` holds the former discussion comments; a non-teacher gets 403 writing a grading remark.
    - `GET /api-json` matches the route table in PROGRESS.md.
    - No file is over 500 lines.
  - Risk: high. This is the largest move and touches `TasksService`'s consumers in documents and websocket; rely on M1. It includes the approved schema change (table rename plus data migration), after which the schema differs from the thesis appendix (`prisma_schema.tex:326`) by decision Q16.

- [x] **M16: Task rules and notifications per thesis**
  - Why:
    - T100: `COMPLETED` only at 100 %; the UI blocks the checkbox and the backend enforces it.
    - T107: auto-completion events go to all involved users.
    - T44/T72: notifications for task assignment, membership and status changes.
    - T41 (UC-10, decision Q2): creating a task inside a project requires project membership. A project is a top-level task.
  - Steps:
    1. In the aggregate, reject `COMPLETED` with progress < 100 (400).
    2. Disable the checkbox in `TaskCard.vue` until progress is 100, instead of the store silently setting 100.
    3. Send realtime updates to creator, assignee and members.
    4. Notify on create/assign, member add/remove and status change through the `notifications` application port.
    5. Creating a subtask (`POST /tasks` with `parent_task_id`, `createSubTask`) requires being the creator or a member of the root task, otherwise 403. Creating a top-level task starts a new project and stays open to every authenticated user with `create_tasks`.
    6. Found in M14: the ghost user 0 is no real person. It can't be added as a task member (400), an `@geloeschter-nutzer` mention sends no mail, and no notification is created for user 0 (for example when a ghost-owned document is graded).
  - Done when: the `// THESIS: T100/T107` tests are flipped, new tests cover each notification type, the frontend checkbox has a Vitest test, and E2E shows a non-member getting 403 when creating a subtask and a member succeeding.
  - Risk: medium. Auto-completion and the cascade-to-children logic set progress themselves and must keep working. The membership check is a behavior change: check the seed and the frontend's subtask flow for users who aren't members today.

- [x] **M17: Unify completion from grades, keeping the read-time recalculation**
  - Why: problems 2 and 3, T119. The thesis's own unit test (`08_…:84-90`) pins that `findOne` recalculates the status on read, so the recalculation stays. Decision B3: student pagination is wrong today (a page plus all its descendants, counted as `total`).
  - Steps:
    1. Keep one implementation of `completeIfAllStudentsGraded` in `task-management/application`, called by grading in `documents-notes` and by the read paths.
    2. Load participants and graded submissions for all listed tasks in batched queries instead of per task.
    3. Add the thesis test "recalculates task status in findOne".
    4. For students, first determine the set of visible task IDs (created, assigned, member, plus all descendants), then page, sort and count over that set, so a page holds at most `limit` tasks and `meta.total`/`totalPages` are correct (decision B3).
    5. Found in M15: `GET /tasks/:id` and its sub-resources (`/comments` read and write, `/activity`, `/documents`, `/subtasks`, `/tree`) check only `view_dashboard`, so a student can read a task, its discussion and its log, and comment on it, outside their visible set. Apply the same visibility rule (staff, or the task is in the user's visible set from step 4) to all of them and answer 404 otherwise; the grading remarks (member or staff) and the member list (member or READ) keep their own checks.
  - Done when: exactly one implementation exists, the thesis test exists and passes, a student gets 404 on `GET /tasks/:id/comments` of a task outside their visible set, `findAll` uses a constant number of queries regardless of page size (asserted with a Prisma mock call count), and a test with 25 visible tasks (including subtasks) and `limit=10` returns 10, 10 and 5 tasks with `total` 25 and `totalPages` 3 for a student.
  - Risk: medium. Grading semantics are subtle; rely on M1's document tests.

- [x] **M18: Task list, priorities and templates per thesis**
  - Why:
    - T57: filter by status, priority, due date and text.
    - T58: four priority levels (niedrig, mittel, hoch, dringend); today the seed has 10 and the UI shows wrong names.
    - T110: save a task as a template; load templates from the real API.
    - T59 (FA-25, decision Q8e): tasks can have tags/labels.
  - Steps:
    1. Add priority and due-date filters to `useTaskFilters`/`TaskFilters.vue`.
    2. Seed exactly the four priorities with the names the UI shows. A data migration (decision Q15) renames IDs 1–4 to Niedrig, Mittel, Hoch, Dringend (what users selected in `TaskForm`), maps tasks and notes with IDs 5–10 by name (Sehr Wichtig, Hoch → 3; Sehr Hoch, Dringend, Kritisch, Blocker → 4), then deletes IDs 5–10. Update `seed.ts` (e.g. `:410`) and `test-seed.ts`.
    3. Add a "save as template" action in `TaskForm` that calls `/tasks/templates` (decision Q6). Make the template API work end to end; since M5 the frontend calls the real `/task-templates`, and found there:
       - `task-templates.service.ts` `basicInclude` selects `first_name`/`last_name` (the columns are `firstname`/`lastname`) and includes `task` (the relation is `tasks`), so every query returns 500 today.
       - `CreateTaskTemplateDto` accepts `default_title`, `default_description` and `default_status`, which are not columns of `task_templates` (only `name`, `description`); `TemplateForm.vue` also sends `default_priority_id` and `default_deadline_days` (400), and `TaskForm.applyTemplate` reads all `default_*` fields. Decide in M18 whether the template stores these defaults (schema change) or the UI drops them.
       - Visibility and ownership (decision E1: private): `GET /task-templates` returns only the requester's templates, update/delete check the owner, and the creator's email is no longer returned. Fix this before or together with the field names, so a working API never exposes other users' templates.
    4. Add the tables `tags` and `task_tags` (approved, Q8e), set tags through the task create/update DTOs, add a tag input to `TaskForm` and tag chips to `TaskCard`. Deleting a task removes its `task_tags` rows.
  - Done when: `useTaskFilters` tests cover the new filters, a seed test checks the four priorities, E2E creates a template from a task and applies it, and E2E creates a task with two tags and reads them back.
  - Risk: medium. The data migration rewrites `priority_id` on existing tasks and notes; a migration test on a copy of the seeded DB checks the mapping. Notes resolve priorities by name (`notes.service.ts:142-158`) and keep working with the four names.

- [x] **M19: Migrate `documents-notes`**
  - Why: L1 and problem 10. `documents.service.ts` has 1,197 lines mixing file validation, storage, access control, grading and UI mapping.
  - Steps:
    1. Domain: the access policy (`document_shares`, T96).
    2. Application: upload, grade and resubmit use cases. Grading calls `task-management`'s completion facade (M17).
    3. Infrastructure: blob storage, magic-byte validation, mapper.
    4. Move notes into the same context.
  - Done when: no file is over 500 lines, there are 0 violations, and the M1 document tests pass unchanged.
  - Risk: medium. The access rules are subtle.

- [x] **M20: Migrate `communication`**
  - Why: L1. Chat rooms, messages and the chat handlers of `websocket.gateway.ts` go into one context. The Socket.io transport moves to `shared/infrastructure/realtime`, and contexts publish through a port.
  - Done when: there are 0 violations, the M6 tests pass, and the cross-browser chat check from `08_…:216` (two browsers, both directions, reload keeps the history) passes manually and is documented in PROGRESS.md.
  - Risk: medium. The gateway also emits task and notification events, which need to move to ports without changing event names.

- [x] **M21: DM deduplication, and task- and class-linked chats**
  - Why:
    - T113 (`07_…:267-269`): the server builds a deterministic `direct_chat_hash` from both user IDs, and on a `UNIQUE` conflict returns the existing room's ID.
    - T29: group chats linked to a task (`task_id`) or a class (`class_id`).
  - Steps:
    1. Build the hash server-side and ignore any client value; on a conflict return the existing room.
    2. Add "open task chat" in the task UI and "class chat" in the class detail view, setting `task_id`/`class_id`. The class chat's members are the class's students and teachers from M36 (decision D2), so this step waits for M36.
  - Done when: an E2E test creates the same DM twice and gets one room ID, and a task's chat can be opened from the task card with `task_id` set.
  - Risk: low–medium. Duplicate DMs that already exist need a one-off merge or must be accepted; document which.

- [x] **M22: Migrate `school-organization`**
  - Why: L1. Classes, departments, subjects, rooms, schedules and lesson slots move into their own context. This context isn't named in the thesis; its features are listed in `05_…:60`.
  - Done when: there are 0 violations, all existing tests pass and `GET /api-json` is unchanged.
  - Risk: low. These are mostly CRUD modules.

- [x] **M36: School organization on the real API**
  - Why:
    - T26 (`05_…:60`, `:105`, UC-20 `:611`, decision D1): classes, departments, schedules, subjects and rooms are managed in the app, not per browser.
    - Decision D2: classes have real students and teachers, which the class chat (T29, M21) needs.
    - Problem 19.
  - Prerequisite: M22 (the `school-organization` context).
  - Steps:
    1. Stores for classes, departments, schedules, subjects and rooms on the existing CRUD APIs (Q19 layering). Remove the localStorage storage (`effsync_classes`, …) and the mock data in `ClassDetail.vue`.
    2. Add simple list/create/edit/delete views for subjects and rooms, with routes and nav links like the existing school-structure views.
    3. Class membership (decision D2, no schema change): `GET /classes/:id` returns its students (`students.class_id`), its teachers (`classes_teachers`) and the head teacher (`head_teacher_id`); `PUT /classes/:id/students` and `PUT /classes/:id/teachers` replace the assignment in one transaction. `ClassDetail` shows and edits both lists.
    4. Rights: Admin and Superuser manage all classes (`manage_classes`); a teacher may change the membership of the classes they teach or head (UC-20), otherwise 403. The class routes in `router/index.js:81-92` are opened to teachers accordingly.
  - Done when: no view under `views/` writes school data to localStorage (grep), each store has Vitest tests, E2E covers creating a class, assigning two students and a teacher, reading them back, and a teacher of another class getting 403; the manual click-through of all five areas is documented in PROGRESS.md.
  - Risk: medium. Data that so far exists only in a browser's localStorage is not migrated (it was never shared); the seed provides the demo data. Opening the class views to teachers is a visible change for that role.

- [x] **M23: Migrate `notifications`**
  - Why: L1. Notifications, e-mail service, preferences and cron jobs move here, and other contexts trigger them only through `notifications/application` (M16's port).
  - Done when: there are 0 violations, the e-mail cron (T46) and @mention mail (T09) are covered by tests, and the hourly overdue job has a test.
  - Risk: low.

- [x] **M24: Migrate `reporting`, with dashboard metrics per thesis**
  - Why:
    - L1.
    - T41 (FA-30): overview of active projects, i.e. top-level tasks that aren't completed (decision Q2).
    - T38: status distribution as a donut chart.
    - T39 (FA-34): one progress bar per project, computed over the top-level task's subtree (decision Q2).
    - T40: top 5 members by completed tasks.
    - T37 (FA-33, decision A4): weekly and monthly trends as a line chart.
    - Not in scope: detailed reporting (T35), deferred to the company version (decision Q1).
  - Steps:
    1. Make `metrics` a read-only reporting context.
    2. Add queries for active projects, per-project progress, top members and the weekly/monthly trends (created and completed tasks per period, from `tasks.created_at` and the activity-log entries; no schema change. If completion dates can't be derived reliably, record the gap in PROGRESS.md and raise it as an open question before any schema change).
    3. Switch `Pie` → `Doughnut` in `StatusDistributionChart.vue`, add a `Line` trend chart with a week/month switch, and add the project list with progress bars and the top-5 list to the dashboard.
  - Done when: the new metric queries have unit tests, and the dashboard shows the FA-30 to FA-35 elements (manual check in PROGRESS.md).
  - Risk: low.

### Frontend alignment

- [x] **M25: Frontend layering through stores, one HTTP client, theme per user**
  - Why: T79 and T80 (`06_…:51`, decision Q19): views and components only render; data goes through stores, which use the `api/` layer. Also problems 13 and 14, and T68: the theme is persisted per user.
  - Steps:
    1. Move the `DashboardView.vue` and `StatusDistributionChart.vue` requests into an `api/` module plus a store.
    2. Put the API and WS base URLs in one config module.
    3. Store the theme server-side in the new `user_settings` table (approved, Q8f) through `GET/PATCH /users/me/settings` in `identity-access` (after M11). The frontend loads it at login and saves it on toggle; the two localStorage keys `theme` and `darkMode` are removed.
    4. Move the `api/` calls of the 18 views and components that import `@/api/` today into Pinia stores (existing ones where they fit, e.g. `taskStore`, otherwise one store per domain), with store tests. Add an ESLint `no-restricted-imports` rule for `@/api/*` and `**/api/*` in `views/` and `components/`.
  - Done when: `grep -rnE "apiClient|fetch\(|from '@/api/" frontend/src/views frontend/src/components` returns nothing (only test files may mock `api/`), the ESLint rule runs in CI, `grep -rn "localhost" frontend/src` hits only the config module, a Vitest test shows the theme restored from `/users/me/settings` after login, and E2E shows a theme set by one session being returned to a second session of the same user.
  - Risk: medium. 18 components change how they get their data; the existing component tests that mock `api/` modules have to mock the stores instead.

- [x] **M26: Global search per thesis**
  - Why: T42 (search covers users and projects; a project is a top-level task, decision Q2) and T43 (results grouped by category).
  - Steps:
    1. Add users to `searchStore`, using the existing `/users` endpoint the chat already uses.
    2. Show matching top-level tasks under a "Projekte" category (the other matching tasks stay under "Aufgaben").
    3. Render the results grouped by type in `LayoutView.vue`.
  - Done when: `searchStore` has tests for each category and the grouped dropdown has a component test.
  - Risk: low.

- [x] **M27: Planned frontend features: grades view, password change, avatar, audit-log view, comments**
  - Why:
    - UNUSED_CODE.md Planned: `GradesView.vue` and its `GET /documents/my-grades` endpoint are complete but unrouted; UC-13 "Note einsehen".
    - T47: the password fields in `SecurityTab.vue` have no handler, and there is no avatar to edit (decision Q8c).
    - T33: an admin view of the activity log (UC-32).
    - T09 and T74 (decision Q16): a comment section and the teacher's grading remarks in the task detail view.
  - Steps:
    1. Add a route and nav link for `GradesView`.
    2. Wire the password change to a backend endpoint (current password plus new password).
    3. Add an admin "Audit-Log" view on `GET /tasks/activity` (M15), which also shows the entries of deleted tasks by their text.
    4. Add a comment section to the task detail view: list and write comments with @mentions on `/tasks/:id/comments`.
    5. Show the grading remarks (`/tasks/:id/grade-remarks`) in the task detail view; teachers can write them from there or from `GradeModal`.
    6. Avatar (decision Q8c): add the `user_avatars` table (approved), `PUT/DELETE /users/me/avatar` (image only, ≤ 1 MB, existing magic-byte check) and `GET /users/:id/avatar`. User responses send `profile_picture` as that URL, which `TaskMembersList.vue` already renders; the profile view and the header show it instead of the initials when present.
  - Done when: each view and section has a component test; the password change, the avatar upload (including a rejected non-image) and writing a comment with an @mention are E2E-tested; non-admins get 403 on the audit-log API.
  - Risk: low. Steps 3–5 depend on M15's routes.

- [x] **M35: Admin user management and Superuser system configuration**
  - Why:
    - T75 (UC-30, decision Q17): "Benutzerverwaltung" is separate from UC-31 "Rollen vergeben", so admins manage the accounts themselves.
    - T77 (UC-40, decision Q18): "Systemkonfiguration" is the RBAC configuration, i.e. which permissions with which flags each role has, guarded by `manage_system`.
  - Steps:
    1. `AdminView`: a user list with create, edit (first name, last name, username, e-mail) and delete, on the existing `POST/PATCH/DELETE /users` endpoints (`manage_users`). Delete runs the ghost-user anonymization (M14) and asks for confirmation.
    1b. Found in M11: `UsersService.removeRoleFromUser` deletes only the `user_roles` row; the direct `user_permissions` that `addRoleToUser` created for that role stay (`RolePermissionsService.removeRolePermissionsIfNotNeeded` has no caller). Removing a role must also remove the permissions it granted.
    2. Backend in `identity-access` (after M11): `PUT /roles/:id/permissions` with `@Roles(RoleName.SUPERUSER)` and `@Permissions('manage_system')`. Today Admin also holds `manage_system` (`role-permissions.config.ts:42`), so the role check is what makes it Superuser-only. The new mapping is written in one transaction.
    3. A "Systemkonfiguration" tab in `AdminView`, visible only to the Superuser, that edits the role → permission mapping and the flags.
    4. Lock-out guard: a request that would take `manage_system` away from the Superuser role is rejected with 400.
  - Done when: E2E covers an admin creating, editing and deleting a user, a non-admin getting 403 on those endpoints, the Superuser changing a role's permissions with the effect visible on a user of that role, an Admin getting 403 on `PUT /roles/:id/permissions`, and the lock-out guard returning 400. Both `AdminView` tabs have component tests.
  - Risk: medium. A runtime change to a role's permissions affects every user of that role at once; `contexts/identity-access/domain/role-permissions.ts` remains the default for fresh databases.

- [x] **M28: Shrink `CalendarView.vue` with `useCalendarUtils`**
  - Why: problems 16 and 17. UNUSED_CODE.md: `useCalendarUtils.js` is Planned/Keep and should replace the inline copies.
  - Steps:
    1. Use `useCalendarUtils` for date math.
    2. Extract the year, month, week and day views into `components/calendar/`.
    3. Extract drag-and-drop into `useCalendarDragDrop`.
  - Done when: `CalendarView.vue` is under 800 lines with no local `getWeekStart`/`formatDate`, `useCalendarUtils.test.js` passes, a smoke test for view switching exists, and a manual check of all views plus drag-and-drop is documented in PROGRESS.md (T60).
  - Risk: high. The view has no tests today; write the smoke test first.

### Quality and operations per thesis

- [x] **M29: Coverage targets and API endpoint tests per thesis**
  - Why: T115 and T117 (`08_…:39-43`), T70, T121 and T123 (`08_…:102`, `:112-138`).
  - Steps:
    1. Bring the units the thesis names to ≥ 90 % or ≥ 75 %, in their new context locations.
    2. Add E2E tests for each endpoint in `08_…:112-138`: happy path, 400, 401, 403, 404.
    3. Add router-guard tests in the frontend.
    4. Enforce the thresholds with `coverageThreshold` (Jest) and `thresholds` (Vitest).
  - Done when: CI fails if a threshold drops, and all endpoint/status combinations from the table are tested.
  - Risk: low.

- [x] **M30: Verify the non-functional requirements and complete the Swagger docs**
  - Why:
    - T61 (NFA-01–03): < 200 ms, frontend loaded in 3 s, 100 concurrent users.
    - T65 (NFA-10): all endpoints documented.
    - T66 (NFA-11): responsive UI.
    - T71 (NFA-15): Chrome, Firefox and Edge.
    - T87 (`06_…:170`, decision Q8h): indexes for joins.
    - T62 (NFA-05, `06_…:213`, decision Q4): HTTPS only, enforced by the app in production.
  - Steps:
    1. Write a reproducible load-test script (e.g. `autocannon` or k6) for the main endpoints with 100 concurrent users against the seeded test DB.
    2. Run a Lighthouse check of the production build.
    3. Add `@ApiTags`/`@ApiOperation`/`@ApiResponse` to every controller.
    4. Do a manual responsive and browser check with a checklist in PROGRESS.md.
    5. Add `@@index` on the foreign-key columns that the main queries join or filter on (e.g. `tasks.parent_task_id`, `created_by`, `assigned_to`, `task_members.user_id`, `chat_messages.room_id`, `notifications.user_id`, `task_activity_log.task_id`), chosen with `EXPLAIN ANALYZE` on the seeded test DB, in one index-only migration (approved, Q8h). Load test before and after.
    6. In production mode (`NODE_ENV=production`), set `trust proxy` and redirect requests whose `X-Forwarded-Proto` isn't `https` to HTTPS (308); Helmet's HSTS stays. Document the reverse-proxy requirement in the README.
  - Done when: the load-test results meet NFA-01 and NFA-03, the measured load time meets NFA-02, every controller has `@ApiTags`, the index migration is applied with before/after numbers in PROGRESS.md, an E2E test in production mode shows an `http` request redirected and an `https` request served, and the manual checklist is documented. Any failed target becomes its own fix milestone.
  - Risk: medium. Meeting < 200 ms may need query work beyond M17.

- [x] **M31: Backup and restore scripts**
  - Why: T15 (`03_…:155`, `05_…:109`): the backup/restore strategy is implemented. It exists only as a document (`documents/AP7-6.md`). T16 (UC-41): per decision Q7 the Superuser fulfils it as the operator who runs these scripts with the runbook; there is no in-app backup function.
  - Steps:
    1. Add `scripts/backup.sh` (`pg_dump -Fc`) and `scripts/restore.sh` (`pg_restore`) with a short runbook.
    2. Add a CI job that backs up the seeded test DB, restores it into a fresh DB and compares row counts.
  - Done when: the CI restore drill is green and the runbook is in the README, naming the Superuser/operator as the person who runs it (UC-41).
  - Risk: low.

- [x] **M32: Two-factor authentication (TOTP)**
  - Why: T31 (`05_…:356-358`, UC-01b `05_…:664-693`, `03_…:155`).
  - Steps:
    1. Enable 2FA in the profile with a QR code and confirmation code.
    2. Let login detect active 2FA and request a 6-digit TOTP code.
    3. Reject a wrong code with 401; after a valid code, issue access and refresh tokens (M12).
    4. Store the secret in the new `user_two_factor` table (decision Q8d), encrypted with a key that config validation requires; deleting a user (M14) deletes the row.
    5. Admin reset: an admin can disable a user's 2FA by deleting the row (documented in the README).
  - Done when: E2E covers enable → login with code → wrong code 401 → admin reset, the stored secret is not plain text, and the `SecurityTab` button works.
  - Risk: medium. Additive schema change (approved, Q8d). Account lockout is covered only by the admin reset; there are no recovery codes.

- [x] **M33: Creator required at database level**
  - Why: T101 (`07_…:82`, decision Q20): "auf Datenbankebene sichergestellt, dass jede Aufgabe einem Ersteller … zugewiesen ist". The other schema items that used to wait here were decided and moved into their feature milestones: tags → M18 (Q8e), theme → M25 (Q8f), avatar → M27 (Q8c), FK indexes → M30 (Q8h), refresh tokens → M12 (Q8b), TOTP → M32 (Q8d), activity log → M15 (Q8g). Reminders need no change (Q22).
  - Prerequisite: M14 (ghost user 0 exists and account deletion reassigns tasks to it).
  - Steps:
    1. Migration: create user 0 if it's missing, set `created_by = 0` where it is NULL, then make `tasks.created_by` `NOT NULL` (approved, Q20).
    2. Make the Prisma relation required and adjust the `Task` aggregate and DTO types.
  - Done when: the migration runs on a copy of the seeded DB that contains a task with `created_by = NULL`, an insert without a creator fails at DB level (test), and all task tests pass.
  - Risk: medium. Migrations touch the schema shown in the thesis appendix (`prisma_schema.tex`), so each change must stay compatible with what the thesis documents.

- [x] **M34: Switch the dependency rules and the type-safety lint rules to `error`**
  - Why: L1, and T64 (NFA-09, SOLID and modular). The architecture must stay enforced.
  - Done when: all contexts are migrated, dependency-cruiser runs with severity `error` and reports 0 violations, CI fails on a deliberately added violation (tried once, then reverted), and the `no-unsafe-*` ESLint rules are `error` for the whole backend with 0 findings (decision Q13).
  - Risk: low.

- [x] **M37: Performance at realistic data volume**
  - Why: M30 found that T61 (NFA-01, < 200 ms) holds on the seed data but fails once the test DB has 20,000 tasks, notifications and chat messages (`scripts/load-test-data.sql`): at 10 connections the task list answers in 454–514 ms (p97.5), the task-progress metrics in ~1.7 s, and `GET /api/notifications` times out. The join indexes of M30 don't help, because the app loads whole result sets.
  - Steps:
    1. Let the task list count and page in the database instead of loading every visible task into memory.
    2. Compute the task-progress metrics with aggregate queries (`groupBy`/`count`) instead of loading the tasks.
    3. Page `GET /api/notifications` (limit and cursor or offset, newest first) and adapt the frontend's notification store.
    4. Measure the per-request auth and permission queries (~29 ms today) and cache the user's permissions per request, if that is the gap.
  - Done when: `npm run load-test` against the scaled test DB (seed plus `load-test-data.sql`, school-sized spread per decision I1) meets NFA-01 (p97.5 < 200 ms at 10 connections) and NFA-03 (100 connections without failures) for all five endpoints, with before/after numbers in PROGRESS.md.
  - Risk: medium. The notification paging changes the API the frontend reads.

## Priorities

| Priority | Milestones | Reason |
|---|---|---|
| **Essential** | M1, M2, M3 | Test foundation; M3 is itself a thesis claim (T122) |
| **Essential** | M4, M5 | Thesis CI claim (T22); dead code has to go before the migration |
| **Essential** | M6, M7, M8, M9 | Thesis security claims that are exploitable or wrong today (T02, T92, T94, T54, T116, T49, T50) |
| **Essential** | M10–M24, M34, M36 | DDD restructuring per `11_Reflexion.tex:25-31`, plus the thesis claims of each context |
| **Essential** | M25, M26, M27, M35 | Frontend thesis claims (T79, T68, T42, T43, T47, T33, T75, T77) and Planned items |
| **Essential** | M29, M30, M37, M31, M32, M33 | Testing, non-functional (M37: performance at realistic volume), backup, 2FA and the creator constraint (T101) |
| Nice-to-have | M28 | File size and duplication only; no thesis claim is affected beyond keeping T60 working |

Suggested order: M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11 → M12 → M13 → M14 → M15 → M16 → M17 → M18 → M19 → M20 → M22 → M36 → M21 → M23 → M24 → M29 → M30 → M37 → M31 → M32 → M33 → M34. The frontend milestones M25 → M26 → M27 → M35 → M28 run in parallel after M5 (their backend steps wait for M11 or M15, see the milestone rules). M33 needs M14.

## Decisions log

Each entry records an open question that was decided, and the parts of the plan it changed. Question numbers are the original ones from Open questions.

- **Q1 Company version** (decided 2026-11-06): this refactor builds only the school version. The company version is built separately later and the refactor doesn't prepare for it. Company roles (T28), teams (T30), detailed reporting (T35) and trends (T37) are Deferred (F11); the trends were brought back by decision A4. 2FA (T31, M32), the audit log (T32, T33) and the GDPR ghost user (T10, M14) stay in scope. Affects: T25, T28, T30, T35, T37, M24, M33, Constraints, Definition of done.
- **Q8i Teams** (decided 2026-11-06): no teams in this refactor, no schema change; teams belong to the company version (decision Q1). Affects: T30, M33.
- **Q2 What is a "Projekt"** (decided 2026-11-06): a top-level task (`parent_task_id = null`) is a project, per `07_…:67`. No schema change. The dashboard lists active projects with one progress bar each, search shows them under "Projekte", and creating a subtask requires being creator or member of the root task (UC-10), otherwise 403. Affects: T41, T39, T42, M16, M24, M26.
- **Q6 `TaskController` and task routes** (decided 2026-11-06): the `Task` aggregate lives in `domain/`, and `TaskController` is the single HTTP entry point for all task operations. All task sub-resources move under `/tasks`: `/tasks/:id/members`, `/tasks/:id/comments`, `/tasks/:id/grade-remarks`, `/tasks/:id/activity`, `/tasks/templates`, plus the admin-only `/tasks/activity` for the audit log (UC-32, added while recording Q8g). The old prefixes are removed. Affects: L1, T33, T110, T130, M15, M27, Target architecture, Constraints.
- **Q6/T88 Chat-room path** (decided 2026-11-06): the chat routes are renamed to `/chat-rooms` (including `/chat-rooms/:id/messages`) in M6; `PATCH` stays. Affects: T88, M6, M20, Constraints.
- **Q16 `comments` module and table** (decided 2026-11-06): the old `comments` module is a plain discussion comment that duplicates `task_comments` and plays no part in grading (grades and feedback live on `documents`), so it's deleted (M5). The `comments` table becomes the real comment store with the @mention mail. `task_comments` is renamed to `task_grade` and holds teachers' grading remarks on a task (text); the grade itself stays on `documents`. Today's `task_comments` rows are moved into `comments` by the migration. Approved schema change. The frontend is adapted where needed. Affects: T09, T74, T85, M5, M14, M15, M27, Constraints.
- **Task-comment UI** (new question from Q16, decided 2026-11-06): the task detail view gets a comment section (list, write, @mentions) and shows the grading remarks. Affects: T09, T74, M27.
- **Q8b Refresh-token storage** (decided 2026-11-06): new table `refresh_tokens(id, user_id, token_hash, expires_at, revoked_at)`. Refresh rotates the token, logout revokes the current session only. Approved schema change. Affects: T51, T123, M12, M14, M33, Constraints.
- **Q9 OAuth callback** (decided 2026-11-06): `?user=` is removed; the token goes into the URL fragment and the frontend loads the user from `GET /auth/profile`. Affects: problem 9, M9, M12.
- **Q8a Password-reset token** (decided 2026-11-06): no schema change. The reset link carries a 30-minute JWT signed with `JWT_SECRET` plus the current password hash, so it works only once. Affects: T52, M13.
- **Q8d TOTP secret** (decided 2026-11-06): new table `user_two_factor(user_id PK, secret_encrypted, enabled_at)`, secret encrypted with a configured key; admin reset deletes the row, no recovery codes. Approved schema change. Affects: T31, M32, Constraints.
- **Q8c Avatar** (decided 2026-11-06): new table `user_avatars(user_id PK, mime_type, data, updated_at)`; upload in the profile, served as `GET /users/:id/avatar` and exposed as `profile_picture`. Approved schema change. Affects: T47, M14, M27, M33, Constraints.
- **Q8e Tags/labels** (decided 2026-11-06): new tables `tags(tag_id, name UNIQUE)` and `task_tags(task_id, tag_id)`; tag input in `TaskForm`, chips on `TaskCard`, no tag filter (FA-24 doesn't list one). Approved schema change. Affects: T59, M18, M33, Constraints.
- **Q8f Theme per user** (decided 2026-11-06): stored server-side in a new `user_settings(user_id PK, theme)` table through `GET/PATCH /users/me/settings`, so it follows the user across devices. Approved schema change. Affects: T68, M14, M25, Constraints.
- **Q8h Foreign-key indexes** (decided 2026-11-06): one index-only migration on the FK columns used in joins and filters, chosen with `EXPLAIN ANALYZE` in M30. Approved schema change (indexes only). Affects: T87, M30, M33, Constraints.
- **Q22 + Q8j Calendar reminders** (decided 2026-11-06): the existing per-user switchable reminders count as "konfigurierbare Erinnerungen": the daily deadline e-mail, the hourly overdue job and `DeadlineToast`. No change, no schema change. Affects: T12, M33.
- **Q20 Creator required at DB level** (decided 2026-11-06): `tasks.created_by` becomes `NOT NULL` after M14; the migration moves NULL rows to the ghost user 0 first. Approved schema change (constraint only). Affects: T101, M33, Constraints.
- **Q21 Dependencies between tasks** (decided 2026-11-06): the example in `09_…:68-72` illustrates the existing completion rule engine, which chapter 7 specifies; tasks are not blocked from starting. No change. Affects: T129.
- **Q15 Priority IDs 5–10** (decided 2026-11-06): keep what users selected. A data migration renames IDs 1–4 to Niedrig, Mittel, Hoch, Dringend, maps 5–10 by name to 3 (Hoch) or 4 (Dringend) and deletes 5–10. No schema change. Affects: T58, M18.
- **Q7 Superuser "Backup & Restore"** (decided 2026-11-06): the scripts and runbook from M31 are enough; the Superuser runs them as the operator. No in-app function. Affects: T16, M31.
- **Q18 Superuser "Systemkonfiguration"** (decided 2026-11-06): the Superuser edits the role → permission mapping and flags through `PUT /roles/:id/permissions` (`@Roles(SUPERUSER)` + `@Permissions('manage_system')`) and a Superuser-only tab in `AdminView`. No schema change. Affects: T77, M35 (new).
- **Q17 Admin user management** (decided 2026-11-06): `AdminView` gets create, edit and delete for user accounts on the existing `/users` endpoints; delete runs the ghost-user anonymization. Affects: T75, M35 (new).
- **Q14 Adding members to a group chat** (decided 2026-11-06): only the creator may add members (`assertIsCreator`, otherwise 403); the REST self-join for group rooms is removed. Affects: T02, T114, M6.
- **Q3 CSRF** (decided 2026-11-06): CSRF protection by design. Bearer header only, no auth cookies, CORS limited to `FRONTEND_URL`; documented, and pinned by E2E tests (no `Set-Cookie`, foreign origin not allowed). No token mechanism. Affects: T13, M9.
- **Q4 CI/CD, HTTPS, availability** (decided 2026-11-06): T17 is met by CI with tests and build (M4), the CD part is the deployment (F1). T62 is enforced by the app in production (`trust proxy`, HTTPS redirect, HSTS; M30). T69 is Deferred to F1, because it can only be measured in production. Affects: T17, T62, T69, M4, M30, Definition of done.
- **Q5 JSON → PostgreSQL migration** (decided 2026-11-06): a completed one-off project step; the Prisma migrations and `seed.ts` are its result. No import script. json-server stays as the dev mock (`06_…:61`). Affects: T19.
- **Q19 Components and the `api/` layer** (decided 2026-11-06): strict. Views and components get data only through stores; the 18 files that import `@/api/` today move their calls into stores, and an ESLint `no-restricted-imports` rule enforces it. Affects: T80, M25, Definition of done.
- **Q10 German role aliases** (decided 2026-11-06): all aliases are removed (backend `normalizeRole`, frontend `DocumentView.vue`), and `frontend/mockdb.json` gets the English role names. Precondition: the role names of every database in use are checked first and recorded in PROGRESS.md. Affects: M7.
- **Q11 Frontend type checking** (decided 2026-11-06): `vue-tsc` is removed from the `build` script; ESLint covers code quality. Affects: M4, problem 18.
- **Q13 Lint strictness** (decided 2026-11-06): gradual. M4 fixes the frontend test globals and every non-type error and sets the backend `no-unsafe-*` rules to `warn`; each migration milestone brings its context to 0 and back to `error`; M34 sets them to `error` for the whole backend. Affects: M4, M11, M15, M19, M20, M22, M23, M24, M34, Definition of done.
- **Q12 Coordination with Ereny** (decided 2026-11-06): no coordination needed. There are no open branches besides `main` and `development`. Affects: M4, M15, M19, M20.
- **A1 Grading remarks: route and rights** (decided 2026-11-06, confirms an assumption made while recording Q16): `/tasks/:id/grade-remarks`; only teachers write (same check as `canGradeDocument`), all members of the task read. Per-student feedback stays on `documents.feedback`. Affects: T74, M15, M27.
- **A2 Audit log across all tasks** (decided 2026-11-06, confirms an addition made while recording Q8g): admin-only `GET /tasks/activity` in the single `TaskController`, paginated and filterable by user, action and period; it also returns entries of deleted tasks. Affects: T33, M15, M27.
- **A3 System configuration only for the Superuser** (decided 2026-11-06, confirms an assumption made while recording Q18): `PUT /roles/:id/permissions` is guarded by `@Roles(RoleName.SUPERUSER)` and `@Permissions('manage_system')`; Admin keeps `manage_system`, the seed is unchanged. Affects: T77, M35.
- **A4 Trends back in the school version** (decided 2026-11-06, revises Q1): the weekly and monthly trends (FA-33) are built in M24 as a line chart, without a schema change. Only detailed reporting (T35) stays with the company version. Affects: T37, M24, Constraints.
- **B1 Demo login** (decided 2026-11-06): `adminadmin` / `password123` stay in the seed; the README states the seed is for development, demos and tests only. Affects: Constraints.
- **B2 German code comments** (decided 2026-11-06): all German comments in `backend/src` and `frontend/src` are translated to English in one comment-only commit in M5, after the deletions; UI text stays German. Affects: M5, Constraints.
- **B3 `meta.total` for students** (decided 2026-11-06): fixed in M17; visible IDs including descendants are determined first, then paged and counted. Response shape unchanged. Affects: M17, problem 2, Constraints.
- **C1 Role-name check** (decided 2026-11-06): `SELECT name FROM roles;` is run on every database in use as the first step of M7, not before. Affects: M7.
- **C2 `UNUSED_CODE.md`** (decided 2026-11-06): its `comments` entry, table row and question 3 now reflect decision Q16. Affects: M5.
- **C3 New commits on `origin/main`** (checked 2026-11-06): `fa5f6ca` and `94b8448` are merges of `development`; the tree of `origin/main` is identical to `e484b02`, the commit this plan is based on. No line reference changes. Affects: nothing.
- **C4 Planning files** (decided 2026-11-06): not committed for now. Affects: nothing.
- **D1 School structure on the real API** (decided 2026-11-06, from a new audit finding): classes, departments and schedules move from localStorage to the existing APIs through stores, and subjects and rooms get a simple UI. New milestone M36 after M22. No schema change. Affects: T26, problem 19, M36, Definition of done.
- **D2 Class membership** (decided 2026-11-06, answers UNUSED_CODE.md question 5): `GET /classes/:id` returns students, teachers and head teacher; `PUT /classes/:id/students` and `/teachers` assign them; admins for all classes, teachers for their own classes. The class chat (M21) uses this membership. No schema change. Affects: T26, T29, M21, M36.
- **E1 Task template visibility** (decided 2026-11-07, found in M5): templates are private. Each user sees, edits and deletes only their own templates (`GET /task-templates` returns only the requester's, update/delete of someone else's gives 404 or 403), and responses no longer include the creator's email. Affects: T110, M18.
- **F1 Base permission** (decided 2026-11-07, found in M8): features every logged-in user needs (chat, notes, notifications, own profile, reading tasks and documents) require `view_dashboard`, which all four roles have. Affects: T54, M8.
- **F2 Students create tasks** (decided 2026-11-07): Student gets `create_tasks` and `edit_tasks` (UC-10…12 list Member/Student as actors; TaskView offers personal tasks). Editing or deleting others' tasks stays limited by the ownership checks. Admin gets the same two, because UC-10 names Admin as an actor. Affects: T54, M8.
- **F3 School administration permission** (decided 2026-11-07): subjects, rooms, departments, schedules and lesson slots use `manage_classes` instead of the non-existent `manage_subjects`/`manage_rooms`/`manage_departments`/`manage_schedules`. Affects: M8, M36.
- **F4 Permissions in existing databases** (decided 2026-11-07): `seed.ts` and `test-seed.ts` follow `contexts/identity-access/domain/role-permissions.ts`, and a data migration inserts the missing `roles_permissions` rows by name into existing databases. Affects: M8.
- **G1 Migration with repository ports** (decided 2026-11-07, found in M11): services in `application/` work through repository ports; Prisma repositories in `infrastructure/` make exactly today's queries. "M2 tests pass unchanged" means every test case, mock and assertion stays the same; only the line that constructs the service under test (and import paths) change. Applies to all context migrations (M11–M24).
- **H1 Rows of a deleted account** (decided 2026-11-07, found in M14): shared content moves to the ghost user 0 (`chat_messages`, `tasks.created_by`, `comments`, `task_comments`/task_grade, `chat_rooms.created_by`, `documents.added_by` for documents attached to a task and `graded_by`, `task_activity_log`, `task_templates.created_by`); `tasks.assigned_to` and `teachers.supervisor_id` become NULL; personal rows are deleted (`user_roles`, `chat_room_users`, `document_shares`, `notifications`, the user's uploads that belong to no task, the user's `notes` with their shares and document links, the user's `notes_users` entries, the `students`/`teachers` row; cascades: `user_permissions`, `email_*`, `refresh_tokens`, `task_members`), and the name is replaced in other members' chat notifications. A teacher who is still head teacher, class teacher or has lesson slots can't be deleted (409) until an admin reassigns them. Nobody can delete their own account or the last Superuser/Admin (400, the same rule as removing a role), and the ghost user can't be changed or deleted. Note (M18): templates are private (decision E1), so under the ghost user they could never be read or deleted again; they count as personal rows and are deleted, and the tasks created from them keep everything but the link. Affects: T10, M14, M15, M16, M18.
- **H2 What a task template stores** (decided 2026-11-08, found in M18): only `name` and `description`, as in the thesis schema (`prisma_schema.tex:286`); no schema change. "Save as template" stores the task's title as `name` and its description; applying a template fills title and description, and the user sets deadline, priority and assignee (07_…:225). The DTO, `TemplateForm` and `TaskForm.applyTemplate` drop the `default_*` fields. Affects: T110, M18.
- **Q8g Activity log on task delete** (decided 2026-11-06): no schema change. The delete transaction writes a "deleted" entry with the task title, sets `task_id = null` on the task's log rows, then deletes the task. Affects: T32, M15, M27, M33.
- **I1 Load-test data for NFA-01** (decided 2026-11-09, found in M37): `scripts/load-test-data.sql` keeps the volume (20,000 tasks, notifications and chat messages) but spreads it over a school-sized set of users (750 students, 40 teachers), so a student sees about 200 tasks. M30's version put every task on the 5 seed students; one of them saw 9,336 of 20,000 tasks, and Postgres alone managed only about 40 such list queries per second on the test machine. That case stays in PROGRESS.md as a stress result. No schema change (a visibility table was not chosen). Affects: T61, M30, M37.
- **I2 Flags in the Systemkonfiguration** (decided 2026-11-10, found in M35): flags stay per permission (`permissions.flags`), as the thesis models them (`06_…:204`, "Permissions sind als Bit-Flags modelliert"); `roles_permissions` gets no flags column. The Superuser tab edits each role's permission set and each permission's R/W/X flags; a flag change applies to every role and every direct grant of that permission. No schema change (Q18 stands). Affects: T77, Q18, M35.
- **I3 Role permissions reach users live** (decided 2026-11-10, found in M35): assigning a role no longer copies its permissions into `user_permissions`; a role's permissions count only through the role (`roles_permissions`), so a Superuser change or a removed role takes effect at once. Direct grants are individual rights only (like the seed's time-limited ones). Copies made earlier through the API can't be told apart from deliberate grants and stay. This replaces M35 step 1b's "removing a role must also remove the permissions it granted". Affects: T75, T77, M35.

## Open questions

**Answered by the thesis or the decisions (removed):**
- *Is `GradesView.vue` planned or abandoned?* Planned, so it gets implemented (decision 4; UC-13 "Note einsehen", T73). That's M27. `NotificationCenter.vue` and `DocumentUploadForm.vue` are Replaced, so they get deleted (decision 4). That's M5.
- *Is the auto-complete-on-read in `GET /tasks` intended?* Yes: the thesis's own unit test pins `findOne` recalculating the status (T119, `08_…:84-90`). M17 keeps it and removes only the N+1 queries.
- *Should E2E tests get a separate test database?* Yes, with reset and `test-seed.ts` automated through Jest (T122, `08_…:105`). That's M3.
- *Are thesis code listings tied to source files?* The thesis is read-only (decision 3), and the mechanisms it names keep their names (Constraints).
- *May `thesis/` and `documents/` be touched?* `thesis/` never (decision 3); `documents/` may be updated (decision 5).

**Still open:** none. Every question has been decided; see the Decisions log.

