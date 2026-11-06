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
