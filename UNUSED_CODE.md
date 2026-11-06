# Unused Code – Origin and Recommendation

Analysis date: 2026-11-06 (branch `development`, commit `e484b02`). Companion to [GOALS.md](GOALS.md) (M6, M12).

**Method.** For each item I checked:
- **Git history:** `git log --follow`, `git log -S/-G` for imports and usages, and the full commit that added it.
- **Replacements:** compared the item with its likely replacement.
- **Documentation:** searched `thesis/`, `documents/`, the READMEs and `TESTS_README.md`.
- **Prisma schema:** checked against `prisma/schema.prisma` for the scaffold modules.
- **Branches:** `git ls-remote --heads origin` lists only `main` and `development`. `main` is 2 commits *behind* `development` (README and test fixes, no extra code), so **no open branch uses any of these items**. The "Used in an open branch" field below is therefore "no" everywhere.

"Never imported" means `git log -S "<import string>"` finds no commit that ever added an import of the file. It was dead from day one.

---

## Backend

### `backend/src/modules/permissions/permission.guard.ts`
- **Category:** Replaced
- **Original purpose:** First permission guard of issue #24, with `@RequirePermission(name, flag)` (required READ/WRITE/EXECUTE flag per endpoint) and `@RequireRole(name)`. It was built on `PermissionCheckerService`.
- **Evidence:**
  - Added in `819dd44` (2026-03-23, Ereny, "#24: add user permissions management"). In `58e1a23` (same day) it was switched to `PermissionsService`.
  - Three days later, `a9f8936` (2026-03-26, Ereny) added `auth/guards/permissions.guard.ts` + `@Permissions()`, which every controller uses today (22 files, applied in `98e1d77`, #38).
  - `git log -S "@RequirePermission("` and `-S "UseGuards(PermissionGuard"` find nothing: it was never applied to an endpoint. 0 % coverage.
- **Replaced by:** `backend/src/modules/auth/guards/permissions.guard.ts`
- **Unique logic worth keeping:** a **per-endpoint required flag**. The live `PermissionsGuard` always checks `PermissionFlag.READ` (`permissions.guard.ts`, `hasAnyPermission(..., PermissionFlag.READ)`), so no endpoint can currently require WRITE/EXECUTE via decorator. If that is wanted, add an optional flag argument to `@Permissions()`. Also note: `PermissionsService.hasRole()` is only called by this file and `roles.guard.ts`, so it becomes dead once both are gone.
- **Used in an open branch:** no
- **Recommendation:** Delete

### `backend/src/modules/auth/guards/roles.guard.ts` + `auth/decorators/roles.decorator.ts` (`@Roles()`)
- **Category:** Planned
- **Original purpose:** Role-based guard (`@Roles('Teacher', 'Admin')` → user needs at least one of the roles), meant to sit next to `PermissionsGuard` as the RBAC half of the "RBAC + ABAC" design.
- **Evidence:**
  - Added in `a9f8936` (2026-03-26, Ereny, #24).
  - `98e1d77` (#38) added `@Roles`/`RolesGuard` only in the documentation `documents/AP7_2-Rollen-Rechteprüfung-AuditLog.md` (examples at lines 57, 73), not in any controller.
  - `documents/mitgliederverwaltung-anleitung.md:1705-1832` even shows it registered as a global `APP_GUARD`, which `app.module.ts` never did.
  - **The thesis describes it as active:** `thesis/content/06_TechnologienUndSystemarchitektur.tex:201`: "Über `RolesGuard` und `@Roles(...)` wird geprüft, ob ein Benutzer mindestens eine erforderliche Rolle besitzt." This was added in `6d56ef9` (2026-07-05, Ereny).
- **Replaced by:** nothing directly. Role checks are done ad hoc with role-name strings in `tasks.service.ts:122`, `:151` and `documents.service.ts:185-286` (GOALS problem 4).
- **Unique logic worth keeping:** the guard itself is simple. The value is that it is the documented mechanism. M4 (shared role helper) could use it instead of inventing a new one.
- **Used in an open branch:** no
- **Recommendation:** ~~Ask owner (Ereny)~~ **Implement (thesis decisions 1 and 4).** The thesis is the source of truth and names `RolesGuard` + `@Roles()` (`06_TechnologienUndSystemarchitektur.tex:201`, THESIS_ALIGNMENT.md T92), so it is applied in GOALS.md M7 with the check order token → role → permission (T97). It also guards the Superuser-only `PUT /roles/:id/permissions` in M35 (decision A3).

### `backend/src/modules/auth/decorators/index.ts`
- **Category:** Scaffold
- **Original purpose:** Barrel file re-exporting `Roles` and `Permissions`. Added in `a9f8936` (#24).
- **Evidence:** never imported. Every controller imports `../auth/decorators/permissions.decorator` directly.
- **Replaced by:** direct imports
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete (together with `roles.decorator.ts` if that goes; otherwise remove only the barrel)

### The 10 empty scaffold modules
`classes-teachers`, `document-shares`, `note-documents`, `notes-users`, `priorities`, `students`, `task-documents`, `teachers`, `user-permissions`, `user-roles` (each `*.module.ts` + empty `*.controller.ts` + empty `*.service.ts`, 17 lines)

- **Category:** Scaffold
- **Original purpose:** `generate_all.js` created one Nest module per Prisma model so every table had a place for its API. The generated controllers and services were never filled in.
- **Evidence:**
  - Created in `7e028b1` / `e856dad` (2026-02-16, Ereny, "#22: feat(modules): Integrate ModulesModule"; two commits with the same message and content). The same run produced `lesson-slots`, `permissions`, `roles`, `task-activity-log` and `task-templates`, which were later filled in.
  - Precedent: Ereny already removed two siblings that stayed empty: `chat-room-users` (`58e1a23`) and `roles-permissions` (`893895b`, 2026-05-15, "remove unused roles-permissions module").
- **Where the tables are actually handled:**

  | Scaffold module | Prisma model | Handled by |
  |---|---|---|
  | `classes-teachers` | `classes_teachers` | **nothing** (only `prisma/seed.ts:371`) |
  | `teachers` | `teachers` | **nothing** (only `prisma/seed.ts:168`) |
  | `document-shares` | `document_shares` | `documents/documents.service.ts` |
  | `note-documents` | `note_documents` | `documents/documents.service.ts` |
  | `notes-users` | `notes_users` | `documents/documents.service.ts` |
  | `priorities` | `priorities` | `notes/notes.service.ts`, `tasks/tasks.service.ts` |
  | `students` | `students` | `schedules`, `tasks`, `documents` services |
  | `task-documents` | `task_documents` | `tasks`, `documents` services |
  | `user-permissions` | `user_permissions` | `users`, `permissions`, `roles/role-permissions`, `task-members`, `tasks` services |
  | `user-roles` | `user_roles` | `users`, `permissions`, `auth`, `tasks`, `documents` services and the auth strategies |

- **Replaced by:** see table. `teachers` / `classes_teachers` have no API at all (seed data only).
- **Unique logic worth keeping:** none. The files contain no code.
- **Used in an open branch:** no
- **Recommendation:** Delete all 10 and their entries in `app.module.ts`. Whether teachers should be assignable to classes via the API is a feature question, not a reason to keep empty files (see questions).

### `backend/generate_all.js`
- **Category:** Scaffold
- **Original purpose:** One-off generator that reads `prisma/schema.prisma` and runs `nest g module/controller/service` for every model that doesn't have a folder yet.
- **Evidence:**
  - Added in `7e028b1` / `e856dad` (2026-02-16, Ereny, #22). That commit also added `prisma-generator-nestjs(-dto)`, which is no longer in `package.json`.
  - Not referenced by any script, doc or thesis file.
- **Replaced by:** `nest g resource` (used directly since, e.g. `46451f2` for subjects)
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete. Running it again would recreate the modules deleted above.

### `test:permissions` script in `backend/package.json`
- **Category:** Abandoned
- **Original purpose:** Ran `backend/test-permissions.ts`, a 251-line ad-hoc script that printed each seeded user's roles and permission validity (VALID / EXPIRED / NOT_YET_VALID) against a fixed date `2026-03-08`.
- **Evidence:**
  - Script and file added in `819dd44` (2026-03-23, Ereny).
  - File deleted in `8757137` (2026-03-26, Ereny, "#24: Remove test permissions script and related functionality"), but the `package.json` entry was left behind.
- **Replaced by:** `permissions.service.spec.ts`, `task-members.service.spec.ts`, `test/mitgliederverwaltung.e2e-spec.ts`
- **Unique logic worth keeping:** none (the script is gone)
- **Used in an open branch:** no
- **Recommendation:** Delete

### `uuid` (+ `@types/uuid`) in `backend/package.json`
- **Category:** Replaced
- **Original purpose:** Unique suffix for uploaded file names on disk (`uuidv4()` in `documents.service.ts`).
- **Evidence:**
  - Introduced in `758754e` (2026-02-10, Ereny, #21).
  - Import removed in `2401a15` (2026-04-15, Ereny, #128) when documents moved to DB storage (migration `20260414232513_store_documents_as_blob`).
  - No import since.
- **Replaced by:** blob storage in the `documents` table
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete

### `passport-local` (+ `@types/passport-local`) in `backend/package.json`
- **Category:** Abandoned
- **Original purpose:** Username/password login via a Passport `LocalStrategy`.
- **Evidence:**
  - Installed in `01ba378` (2026-02-11, Drazen, "#19: npm instal passport, passport-local, passport-jwt").
  - `git log -G "passport-local|LocalStrategy" -- backend/src` finds nothing: it was never used. Login is done in `AuthService` and returns a JWT checked by `JwtStrategy`.
  - `documents/Projekt-Uebersicht.md:809` still lists "LocalStrategy, JwtStrategy", which is outdated.
- **Replaced by:** `auth/auth.service.ts` (manual credential check) + `auth/strategies/jwt.strategy.ts`
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** ~~Delete~~ **Keep, overridden by the thesis.** `thesis/content/08_TestingUndQualitätssicherung.tex:40` names `LocalAuthGuard` as a security component (THESIS_ALIGNMENT.md T116), so `passport-local` gets used in GOALS.md M9 instead of being removed

### `backend/src/modules/comments/` (whole module) *(newly found)*
- **Category:** Planned
- **Original purpose:** CRUD API for a new `comments` table (`content`, `created_by`, `task_id`). It was created in the same commit that dropped `notes.task_id`, which had been added for teacher grading (migration `20260331123819_add_task_id_to_notes_for_teacher_grading`). It looks like grading comments were meant to move from notes into this table. That is an inference from the migration sequence, not stated anywhere.
- **Evidence:**
  - Added in `51f9364` (2026-05-17, Ereny, "#115: feat(comments): Implement comments functionality with CRUD operations and validation"), together with migration `20260517172720_add_comments_model`.
  - **`CommentsModule` is not imported in `app.module.ts`**, so `/api/comments` doesn't exist at runtime.
  - The frontend never calls `/comments`.
  - The `comments` table *is* used: seeded at `prisma/seed.ts:892`, and cleaned up in `tasks.service.ts:548` on task delete. It also appears in the thesis schema listing `thesis/content/prisma_schema.tex:337`.
  - Meanwhile the live comment feature uses the separate `task_comments` table via `task-comments/` (with @mention emails).
- **Replaced by:** `backend/src/modules/task-comments/` for task comments. Grading feedback is stored in `documents.feedback` (`GradeDocumentDto`).
- **Unique logic worth keeping:** none functionally. It duplicates `task-comments`, and its endpoints use `@Permissions()` with no arguments, so they would be unprotected beyond JWT.
- **Used in an open branch:** no
- **Recommendation:** ~~Ask owner (Ereny)~~ **Delete the module, reuse the table (GOALS.md decision Q16).** The module isn't for grading: it stores only `task_id`, `created_by` and `content`, its seed rows are discussion comments (`seed.ts:884-891`), and grading feedback already lives in `documents.feedback` (`documents.service.ts:849-885`, `GradeModal.vue`). So it duplicates `task_comments` and is deleted in GOALS.md M5. The `comments` table stays and becomes the real comment store in M15; `task_comments` is renamed to `task_grade` for teachers' grading remarks, and its rows move into `comments`.

### 19 empty `entities/*.entity.ts` files *(newly found)*
`auth`, `chat-messages`, `chat-rooms`, `classes`, `departments`, `documents`, `lesson-slots`, `notes`, `notifications`, `rooms`, `schedules`, `subjects`, `task-activity`, `task-activity-log`, `task-comments`, `tasks`, `task-templates`, `templates`, `users` (each one line: `export class X {}`)

- **Category:** Scaffold
- **Original purpose:** Generated by `nest g resource` for TypeORM-style entities. With Prisma they were never needed.
- **Evidence:** e.g. `8594e20` (2026-01-28, Drazen, "#18: nest g res modules/tasks"), `6728d69` (documents), `e0b7b33` (auth). None is imported anywhere. `task-members/entities/task-member.entity.ts` has real content, is imported and is **not** part of this item.
- **Replaced by:** Prisma-generated types (`@prisma/client`)
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete

### `backend/src/modules/notifications/dto/mark-as-read.dto.ts` *(newly found)*
- **Category:** Abandoned
- **Original purpose:** Request body `{ is_read: boolean }` for marking a notification read or unread.
- **Evidence:** added in `640f2c8` (2026-02-24, Drazen, "#23: implemeted dto for mark as read"), never imported (`git log -S "MarkAsReadDto"` = only that commit). `notifications.controller.ts:78` `markAsRead(id, req)` takes no body and can only mark as read.
- **Replaced by:** the body-less `PATCH` endpoint
- **Unique logic worth keeping:** none (mark-as-unread was never implemented)
- **Used in an open branch:** no
- **Recommendation:** Delete

### `backend/src/modules/documents/dto/create-document.dto.ts` *(newly found)*
- **Category:** Replaced
- **Original purpose:** JSON body for creating a document record with `file_path` (disk storage era).
- **Evidence:** generated in `6728d69` (2026-01-28, #18). Last import removed in `2401a15` (2026-04-15, #128) when upload became multipart + blob.
- **Replaced by:** `documents/dto/upload-document.dto.ts`
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete

### `backend/test/task-members.service.spec.ts` *(newly found, dead test)*
- **Category:** Unclear (probably misplaced, not abandoned)
- **Original purpose:** Unit tests for `TaskMembersService` with mocked Prisma.
- **Evidence:**
  - Added in `a9f8936` (2026-03-26, Ereny), the same commit as `src/modules/task-members/task-members.service.spec.ts`.
  - Matches neither jest config (unit: `rootDir: src`; e2e: `.e2e-spec.ts$`), so **it has never run in CI**.
  - Its 17 tests cover `addMember` (creator may add, already member → 400, no permission → 403, task missing → 404) and `isMember` (creator / assigned_to / explicit). The 24 tests in the `src/` copy cover only flag maths and `hasTaskPermission`. So the test cases don't overlap.
  - The thesis cites "Unit-Tests (z. B. für `TaskMembersService` mit gemocktem `PrismaService`)" (`08_TestingUndQualitätssicherung.tex:180`).
- **Replaced by:** nothing. Partly complementary to the `src/` spec.
- **Unique logic worth keeping:** the `addMember` error-path tests
- **Used in an open branch:** no
- **Recommendation:** Keep and move it under `src/` (planned in GOALS M2). Fix it if tests fail once it actually runs.

### `backend/prisma/test-seed.ts` *(newly found)*
- **Category:** Planned
- **Original purpose:** Deterministic seed for API/e2e tests (1 class, 4 tasks, chats, notifications).
- **Evidence:**
  - Added in `6db5f4d` (2026-05-31, Ereny), last changed in `34e7731` (same day).
  - `documents/AP8-1.Teststrategie.md:132-138` describes a `test:seed` script that doesn't exist.
  - **The thesis says it is in place:** `08_TestingUndQualitätssicherung.tex:105`: "Vor dem Start der API-Test-Suite wird die Datenbank daher über den Befehl `prisma migrate reset --force` vollständig zurückgesetzt und mittels … `test-seed.ts` … neu befüllt. Dieser Prozess wird vollautomatisiert über die Jest-Konfiguration gesteuert."
  - `test/jest-e2e.json` has no `globalSetup` and no script calls the file.
- **Replaced by:** nothing
- **Unique logic worth keeping:** the whole file (it is the missing piece for GOALS open question 6)
- **Used in an open branch:** no
- **Recommendation:** Keep. Wire it into the e2e setup with a separate test database so the thesis statement becomes true, or correct the thesis.

### `backend/prisma/diplom_arbeit_postgres.sql` *(newly found)*
- **Category:** Replaced
- **Original purpose:** Hand-written SQL script that created the initial PostgreSQL schema (enums, tables).
- **Evidence:**
  - Added in `8c38e01` (2026-02-10, Drazen, "#21: added sql skript for postgresdb"). The first Prisma migration `20260210122829_init_postgres` came the same day, and 16 migrations have followed since.
  - Never changed after creation, so it no longer matches the schema.
  - Listed as "SQL-Dump der kompletten DB" in `documents/Projektstruktur-Detailliert.md:174` and `documents/verzeichnisstruktur.md:237`. Not mentioned in the thesis.
- **Replaced by:** `backend/prisma/migrations/`
- **Unique logic worth keeping:** none (outdated)
- **Used in an open branch:** no
- **Recommendation:** Delete (and drop the two doc lines)

### `backend/src/modules/templates/` and `backend/src/modules/task-activity/` *(found during the thesis audit)*
- **Category:** Scaffold
- **Original purpose:** `nest g resource` output for templates and task activity. The services return placeholder strings such as `"This action returns all templates"` and never touch the database.
- **Evidence:**
  - Generated in `8d28986` and `c7842be` (2026-01-28, Drazen, "#18: nest g res modules/templates" / "…/task-activity"), and never filled in.
  - Both modules are registered in `app.module.ts:71-72`, so they are **not dead at runtime; they cause bugs**:
    - The frontend's `api/taskTemplates.js:4` calls `/templates` and gets the stub, while the real API is `task-templates` (THESIS_ALIGNMENT.md T110).
    - `TaskActivityController` uses the same prefix `task-activity` as `TaskActivityLogController` (`task-activity-log.controller.ts:10`). Because it is registered first, it shadows the activity-log API (T33).
- **Replaced by:** `modules/task-templates/` and `modules/task-activity-log/`
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete. In the same change, point `frontend/src/api/taskTemplates.js` to `/task-templates`

---

## Frontend

### `frontend/src/components/UserProfile.vue`
- **Category:** Replaced
- **Original purpose:** Admin page for one user (`route.params.id`): show and edit name/email, list and add/remove roles, list and add/remove permissions with `valid_from`/`valid_to`. Editing required `manage_users`.
- **Evidence:**
  - Added in `cceb9c1` (2026-03-26, Ereny, "#24 Implement task members management component and documentation"), never imported.
  - Four days later `fe8fac4` (2026-03-30, Ereny, "#38: Enhance user and role management in admin panel") added `views/AdminView.vue`, which does role/permission management including validity dates (`AdminView.vue:136-145`, `adminService.assignPermissionToUser(…, validFrom, validTo)`).
  - The router's `UserProfile` route points to `views/UserProfileView.vue`, the user's *own* profile (tabs, notifications, email preferences).
  - Documented as a component in `documents/mitgliederverwaltung-anleitung.md:1265` and `documents/Projektstruktur-Detailliert.md:292`.
- **Replaced by:** `views/AdminView.vue` (roles/permissions) and `views/UserProfileView.vue` (own profile)
- **Unique logic worth keeping:** **an admin can edit another user's first name, last name and email** (`saveProfile` → `usersApi.updateUser(userId, …)` → `PATCH /users/:id`). No other frontend file calls `updateUser`, so this ability exists only here.
- **Used in an open branch:** no
- **Recommendation:** ~~Ask owner (Ereny / you)~~ **Delete (GOALS.md decision Q17).** Admins do get to edit other users' master data, but as part of full user management in `AdminView.vue` (create, edit, delete on the existing `/users` endpoints, GOALS.md M35), not by reviving this component. It is deleted in M5; M35 rebuilds the edit form in `AdminView`.

### `frontend/src/views/GradesView.vue`
- **Category:** Planned
- **Original purpose:** A student's "my grades" page: lists all graded submissions with a detail modal.
- **Evidence:**
  - Added in `b79b9c4` (2026-05-16, Ereny, "#115: … Added a new GradesView component to display user's grades with detailed views"), together with the backend endpoint `GET /documents/my-grades` (`documents.controller.ts:111-117`) and `api/documents.js:39 fetchMyGrades`.
  - No route was ever added: `git log -G "[Gg]rades" -- router/index.js LayoutView.vue` finds nothing.
  - `fetchMyGrades` and `/documents/my-grades` have no other caller.
  - Not mentioned in the thesis, README or `documents/`.
- **Replaced by:** partially. `views/DocumentView.vue:111-134` shows grade and feedback per document, but there is no aggregated per-student overview.
- **Unique logic worth keeping:** the aggregated grade overview and its backend endpoint `getMyGrades`
- **Used in an open branch:** no
- **Recommendation:** ~~Ask owner (Ereny)~~ **Implement (thesis decision 4).** UC-13 "Note einsehen" (THESIS_ALIGNMENT.md T73) requires it, so GOALS.md M27 adds a route and nav link; the view, `fetchMyGrades` and `GET /documents/my-grades` stay.

### `frontend/src/components/notifications/NotificationCenter.vue`
- **Category:** Replaced
- **Original purpose:** Bell icon with a dropdown panel: notification list filtered by type with per-type counts, mark-as-read on click, and toast pop-ups for new notifications.
- **Evidence:**
  - Added in `20c2188` (2026-02-22, Ereny, "#25: feat: Implement notification system with Notification Center, Toasts, and List components"). Never imported (`git log -S "import NotificationCenter"` is empty).
  - Listed in `documents/Projektstruktur-Detailliert.md:329`.
- **Replaced by:**
  - `views/LayoutView.vue:174-205`: notification list inside the user dropdown.
  - `components/notifications/NotificationsList.vue`: the same type filter tabs and counts (`:35-44`), used in `UserProfileView.vue` and `SettingsView.vue`.
  - `components/notifications/DeadlineToast.vue`, mounted in `App.vue`, for toasts.
- **Unique logic worth keeping:** none. Filter and counts exist in `NotificationsList.vue`, toasts in `DeadlineToast.vue`.
- **Used in an open branch:** no
- **Recommendation:** Delete

### `frontend/src/components/notifications/NotificationToast.vue` *(newly found)*
- **Category:** Replaced
- **Original purpose:** Toast component used by `NotificationCenter.vue`.
- **Evidence:** added in `20c2188` (#25). Its **only** importer is `NotificationCenter.vue`, so it is transitively dead. `notificationStore.js:8` says toasts are "für DeadlineToast Component" (feature #27).
- **Replaced by:** `components/notifications/DeadlineToast.vue`
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete (together with `NotificationCenter.vue`)

### `frontend/src/components/DocumentUploadForm.vue`
- **Category:** Replaced
- **Original purpose:** Reusable upload form (file picker, 25 MB check, emits `upload`).
- **Evidence:**
  - Added in `04f4bf7` (2026-02-08, Ereny, #21), then edited in `af2b4e2`, `2401a15` and `b79b9c4`. In `b79b9c4` the commit message says it was updated to accept markdown, so it was kept in sync although nothing imported it (`git log -S "import DocumentUploadForm"` is empty).
  - Listed in `documents/Projektstruktur-Detailliert.md:291`.
- **Replaced by:** the inline upload in `views/DocumentView.vue`: the same `accept` list (`:14`), the same `MAX_FILE_SIZE` (`:261`, `:379`), plus task selection (`:48`), which the form never had.
- **Unique logic worth keeping:** drag-and-drop file selection (7 `drop`/`dragover` occurrences; `DocumentView.vue` has none). That's a UI nicety, not a rule.
- **Used in an open branch:** no
- **Recommendation:** Delete

### `frontend/src/stores/userStore.js`, `stores/entities/calenderStore.js`, `stores/entities/documentStore.js`
- **Category:** Scaffold
- **Original purpose:** Placeholders from the initial store layout (user, calendar and document state).
- **Evidence:**
  - All three are **0-byte files**, created in `828b487` (2025-12-13, Drazen, "#9: impelemnted store structure") together with `authStore`, `taskStore` and `templateStore` (which were filled in later). Never modified.
  - `userStore` appears in `documents/Projekt-Uebersicht.md:215` and `Projektstruktur-Detailliert.md:365,372`.
- **Replaced by:** user data lives in `stores/authStore.js`; calendar and document state is local to `CalendarView.vue` / `DocumentView.vue`
- **Unique logic worth keeping:** none (empty)
- **Used in an open branch:** no
- **Recommendation:** Delete (and drop the doc lines)

### `frontend/src/components/tasks/AddMemberDialog.vue` (+ `AddMemberDialog.spec.js`)
- **Category:** Replaced
- **Original purpose:** Modal for adding **one** user to a task (dropdown, hides existing members, emits `member-added`).
- **Evidence:**
  - Added with its 16-test spec in `d13acc6` (2026-03-29, Ereny, #24), the same commit that added `TaskMembersList.vue`, which has its own inline add section (`:73-92`, `addMembers` at `:254`) with **multi-select** and `Promise.allSettled`.
  - Only importer: its own spec.
  - Docs still show it in the flow: `documents/Projektstruktur-Detailliert.md:548`, `documents/verzeichnisstruktur.md:63-64,101`, `components/tasks/TESTS_README.md:36-56`.
- **Replaced by:** `components/tasks/TaskMembersList.vue` (used by `TaskForm.vue:190`)
- **Unique logic worth keeping:** none. `TaskMembersList.vue:201 availableUsers` also hides existing members.
- **Used in an open branch:** no
- **Recommendation:** Delete the component and its spec. The frontend test count drops from 142 to 126 (`AddMemberDialog.spec.js` has 16 `it()` calls; I didn't rerun the suite to confirm), so update `TESTS_README.md` and check that the thesis doesn't quote the old number. I found no test counts in `thesis/content/08_*.tex`.

### `frontend/src/composables/useCalendarUtils.js`
- **Category:** Planned
- **Original purpose:** Extract date helpers out of `CalendarView.vue`: `getWeekStart`, `getIsoWeek`, `formatDateKey`, `setDateKeepingTime` and `getWeekDays`.
- **Evidence:**
  - Added with `useCalendarUtils.test.js` in `46a7677` (2026-04-12, Ereny, #33). In **the same commit** `CalendarView.vue` kept its own `getWeekStart` / `formatDate` (the commit's version shows them at lines 173 and 184; today they are at `:451` and `:462`).
  - Only importer: its own test.
- **Replaced by:** nothing. It is the duplicate that *should* be used.
- **Unique logic worth keeping:**
  - `formatDateKey` has an invalid-date guard that `CalendarView.formatDate` lacks.
  - `setDateKeepingTime` and `getIsoWeek` exist only here.
  - `getWeekStart` is identical to the inline copy.
- **Used in an open branch:** no
- **Recommendation:** Keep. GOALS M13 replaces the inline copies in `CalendarView.vue` with this composable, and it is already tested. If M13 is dropped, delete it.

### `frontend/src/api/index.js`
- **Category:** Replaced (but still has one importer)
- **Original purpose:** Ereny's first axios client plus an `authApi` (`/login`, `/logout`, `/user/profile`) for the initial auth and layout work.
- **Evidence:**
  - Added in `7592ebf` (2025-12-30, Ereny, #10). Drazen's `api/httpClient.js` and `api/authService.js` already existed (`a20ea44`, 2025-12-13, "#9: basic strukture for api").
  - `ded8f78` (2026-02-11, Drazen, #19) switched `authStore.js` from `import { authApi } from '@/api'` to `authService`. From then on `authApi` was dead.
  - `675b424` (2026-02-23, Ereny, #26) then imported `apiClient` from `./index` in the new `api/emailPreferences.js`, its only importer today. Every other API module uses `httpClient.js`, so this looks accidental, but that is an inference.
- **Replaced by:** `api/httpClient.js` (adds the 401 → logout and 429 handling) and `api/authService.js`
- **Unique logic worth keeping:** only the `Accept: application/json` header (harmless to add to `httpClient.js`)
- **Used in an open branch:** no
- **Recommendation:** Delete after pointing `api/emailPreferences.js` to `httpClient.js` (GOALS M11). Note the default `baseURL` here is `http://localhost:3000` *without* `/api`.

### `@nestjs/swagger` in `frontend/package.json`
- **Category:** Abandoned (installed by mistake)
- **Original purpose:** none in the frontend. It's the backend's API-docs library.
- **Evidence:** `4edbe13` (2026-01-28 13:08, Drazen, "#18: npm i @nestjs/swagger") touches only `frontend/package*.json`. On the same day `bc8179a` with the identical message installed it in the backend, where it is used. `git log -S "nestjs/swagger" -- frontend/src` is empty.
- **Replaced by:** n/a
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete

### `uuid` in `frontend/package.json`
- **Category:** Abandoned
- **Original purpose:** probably client-side IDs, installed with the initial libraries. The intended use isn't stated anywhere, so that part is a guess.
- **Evidence:** `ef878f8` (2025-12-02, Drazen, "#9: npm install vue-router pinia axios uuid"). `git log -S "uuid" -- frontend/src` is empty, so it was never imported.
- **Replaced by:** n/a (e.g. `notificationStore.js:135` uses `Date.now()` as toast id)
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete

### `happy-dom` in `frontend/package.json`
- **Category:** Abandoned
- **Original purpose:** DOM environment for Vitest. It was installed as an alternative to `jsdom`.
- **Evidence:** both were installed in `699e65f` (2026-01-18, Drazen, "#17: instaled cypres vitest as save dev depend"). `cd10c08` ("#17: activated vitest") configured `environment: 'jsdom'` (`vite.config.js:23`). No file has ever set `happy-dom`.
- **Replaced by:** `jsdom`
- **Unique logic worth keeping:** none
- **Used in an open branch:** no
- **Recommendation:** Delete

---

## Other (outside `src/`, found along the way)

### `proto.html` (repo root)
- **Category:** Replaced (as UI); historical deliverable
- **Original purpose:** Static HTML/CSS click prototype ("HR Dashboard", dark mode toggle) from the planning phase.
- **Evidence:**
  - Commits `fd08d30`, `775d25a` (2025-07-03) and `68fea33` (2025-11-19), all by Ereny.
  - Work package "AP 2.2 Prototyp proto.html verfeinern" (`documents/arbeitspakete.md:24`, `documents/ProtoMeilenstein.md:16`); "Prototyp (veraltet)" in `documents/Projektstruktur-Detailliert.md:12`.
  - **Named in the thesis** as a milestone deliverable: `03_ProjektmanagmentUndArbeitsweise.tex:178` ("Erstellung der `proto.html` als visueller Orientierungsrahmen").
- **Replaced by:** the Vue frontend
- **Unique logic worth keeping:** none for the app
- **Used in an open branch:** no
- **Recommendation:** Keep. The thesis cites it as a project artifact. Moving it to `documents/` would be fine; that only changes where the file lives.

### `thesis/content/04_DigitalerWorkflosMitGithub.tex`
- **Category:** Replaced
- **Original purpose:** Chapter 4 of the thesis before the file was renamed. The name contains the typo "Workflos".
- **Evidence:**
  - `thesis/main.tex:58` includes `04_DigitalerWorkflowMitGitHub` only.
  - Your spelling fixes `dc3d3e3` and `0eb2e11` (2026-07-03) went into the old file. Two days later `6d56ef9` (2026-07-05, Ereny) created the included file.
  - The two files differ only by one added `\label{ch:workflow}` line, so your fixes are in the included copy.
- **Replaced by:** `thesis/content/04_DigitalerWorkflowMitGitHub.tex`
- **Unique logic worth keeping:** none (the included file is a superset)
- **Used in an open branch:** no
- **Recommendation:** ~~Delete~~ **Keep, `thesis/` is read-only (GOALS.md decision 3).** The thesis is submitted and graded, so this refactor doesn't remove the file. It isn't built (`main.tex:58` includes only the correctly named file), so it does no harm.

---

## Found by knip in GOALS.md M5 (removed there)

`knip` (added in M5) reported these in addition to the items above. Each was checked by grep and `git log -S` before removal; none was ever imported.

| Item | Evidence | Action |
|---|---|---|
| backend `cookie-parser` + `@types/cookie-parser` | installed in `cda564d`/`02b887a` (#19), never imported; auth stays cookie-free (decision Q3) | Deleted |
| backend `file-type` | added in `20453a6` (#21), never imported | Deleted |
| backend `@prisma/config` | `prisma.config.ts` imports `prisma/config`, which ships it | Deleted |
| backend `swagger-ui-express` | `@nestjs/swagger` 11 serves the UI itself; the E2E test for `GET /api` still passes | Deleted |
| backend `@eslint/eslintrc`, `source-map-support`, `ts-loader` | Nest template leftovers; no FlatCompat, no webpack build | Deleted |
| `PERMISSION_DESCRIPTIONS` in `config/role-permissions.config.ts` | added in `f1d108e` (#115), never read; `permissions.description` is the column for this | Deleted |
| `frontend/src/components/Dashboard.vue` | static prototype from `eda940b` (2025-12-02, #9), replaced by `views/DashboardView.vue` | Deleted |
| `frontend/src/components/Badge.vue` | permission validity badge from `cceb9c1` (#24), never imported | Deleted |
| `fetchRoomById` in `frontend/src/api/chat.js`; default export of `api/httpClient.js` | never used (the one default import in `api/metrics.js` now uses the named export) | Deleted |
| frontend `@faker-js/faker`, `@pinia/testing`, `eslint-plugin-vitest` | never imported | Deleted |
| `RoleName` export, `fetchMyGrades`, lesson-slot CRUD in `api/lessonSlots.js`, `GradesView.vue`, `passport-local` | Planned | Kept as knip ignores (`@public` tag or `knip.jsonc`) with a pointer to M7, M27, M36 and M9 |

---

## Summary table

| File | Category | Recommendation |
|---|---|---|
| `backend/src/modules/permissions/permission.guard.ts` | Replaced | Delete |
| `backend/src/modules/auth/guards/roles.guard.ts` + `decorators/roles.decorator.ts` | Planned | Implement (M7, T92) |
| `backend/src/modules/auth/decorators/index.ts` | Scaffold | Delete |
| 10 empty scaffold modules (`classes-teachers` … `user-roles`) | Scaffold | Delete |
| `backend/generate_all.js` | Scaffold | Delete |
| `test:permissions` script | Abandoned | Delete |
| backend `uuid` + `@types/uuid` | Replaced | Delete |
| backend `passport-local` + `@types/passport-local` | Abandoned | **Keep (thesis T116; used in GOALS M9)** |
| `backend/src/modules/comments/` *(new)* | Planned | Delete module, table reused (decision Q16) |
| 19 empty `entities/*.entity.ts` *(new)* | Scaffold | Delete |
| `notifications/dto/mark-as-read.dto.ts` *(new)* | Abandoned | Delete |
| `documents/dto/create-document.dto.ts` *(new)* | Replaced | Delete |
| `backend/test/task-members.service.spec.ts` *(new)* | Unclear | Keep (move into `src/`) |
| `backend/prisma/test-seed.ts` *(new)* | Planned | Keep (wire up) |
| `backend/prisma/diplom_arbeit_postgres.sql` *(new)* | Replaced | Delete |
| `backend/src/modules/templates/`, `backend/src/modules/task-activity/` *(thesis audit)* | Scaffold | Delete (repoint `api/taskTemplates.js`) |
| `frontend/src/components/UserProfile.vue` | Replaced | Delete (M5; user management in M35, decision Q17) |
| `frontend/src/views/GradesView.vue` | Planned | Implement (M27, UC-13) |
| `frontend/src/components/notifications/NotificationCenter.vue` | Replaced | Delete |
| `frontend/src/components/notifications/NotificationToast.vue` *(new)* | Replaced | Delete |
| `frontend/src/components/DocumentUploadForm.vue` | Replaced | Delete |
| `frontend/src/stores/userStore.js`, `entities/calenderStore.js`, `entities/documentStore.js` | Scaffold | Delete |
| `frontend/src/components/tasks/AddMemberDialog.vue` + spec | Replaced | Delete |
| `frontend/src/composables/useCalendarUtils.js` | Planned | Keep (adopt in M13) |
| `frontend/src/api/index.js` | Replaced | Delete (after M11 repoint) |
| frontend `@nestjs/swagger` | Abandoned | Delete |
| frontend `uuid` | Abandoned | Delete |
| frontend `happy-dom` | Abandoned | Delete |
| `proto.html` *(new)* | Replaced | Keep (thesis artifact) |
| `thesis/content/04_DigitalerWorkflosMitGithub.tex` *(new)* | Replaced | Keep (`thesis/` is read-only) |

## Questions only you or Ereny can answer

1. ~~**RolesGuard / `@Roles()` (Ereny):**~~ *Answered by the thesis decisions: implemented in GOALS.md M7.* The thesis (`06_…:201`) says it is used, but no endpoint uses it. Should we apply it (e.g. in M4) or delete it and correct the thesis sentence?
2. ~~**GradesView (Ereny):**~~ *Answered by the thesis decisions: implemented in GOALS.md M27 (UC-13).* Was the student grade overview meant to ship? If yes, it only needs a route and a nav link. If no, the `GET /documents/my-grades` endpoint goes too.
3. ~~**`comments` module and table (Ereny):**~~ *Answered by GOALS.md decision Q16: module deleted, table reused for real comments.* What was the `comments` table meant for, next to `task_comments`? Was it meant for teacher grading comments after `notes.task_id` was dropped? Can the module be deleted? Can the table be dropped later (schema change, seed and the thesis listing `prisma_schema.tex` would change)?
4. ~~**UserProfile.vue (you / Ereny):**~~ *Answered by GOALS.md decision Q17: the component is deleted; user management goes into `AdminView` (M35).* Should admins be able to edit *other* users' name and email? That ability exists only in this unused component.
5. ~~**Teachers ↔ classes:**~~ *Answered by GOALS.md decision D2: class membership gets an API and an assignment UI in M36.* `teachers` and `classes_teachers` are seeded but have no API at all. Is assigning teachers to classes a planned feature? This doesn't affect deleting the empty scaffold modules.
6. ~~**E2E reset with `test-seed.ts` (Ereny):**~~ *Answered by the thesis decisions: built in GOALS.md M3 (T122).* The thesis (`08_…:105`) states the e2e suite resets and reseeds the DB automatically through the Jest config, but no such setup exists. Was it set up locally and never committed? Or should we build it now, or correct the thesis?
