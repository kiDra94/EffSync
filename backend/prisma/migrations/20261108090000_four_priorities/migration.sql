-- T58 (GOALS.md M18, decision Q15): exactly four priorities, keeping what
-- users selected. Data only, no schema change.
--
-- 1. Notes chose their priority by name (low/medium/high, NotesService
--    resolvePriorityId), never by the IDs TaskForm shows, so all of them move
--    by their old name, before IDs 1-4 are renamed.
UPDATE "notes" AS n SET "priority_id" = CASE
    WHEN p."name" IN ('Sehr Niedrig', 'Niedrig', 'Low') THEN 1
    WHEN p."name" IN ('Normal', 'Mittel', 'Medium') THEN 2
    WHEN p."name" IN ('Wichtig', 'Sehr Wichtig', 'Hoch', 'High') THEN 3
    WHEN p."name" IN ('Sehr Hoch', 'Dringend', 'Kritisch', 'Blocker') THEN 4
  END
FROM "priorities" AS p
WHERE n."priority_id" = p."priority_id"
  AND p."name" IN ('Sehr Niedrig', 'Niedrig', 'Low', 'Normal', 'Mittel', 'Medium',
                   'Wichtig', 'Sehr Wichtig', 'Hoch', 'High',
                   'Sehr Hoch', 'Dringend', 'Kritisch', 'Blocker');

-- 2. Tasks keep IDs 1-4 (users picked them in TaskForm, which has always
--    shown them as Niedrig/Mittel/Hoch/Dringend); IDs above 4 move by name.
UPDATE "tasks" SET "priority_id" = 3
WHERE "priority_id" IN (SELECT "priority_id" FROM "priorities"
  WHERE "priority_id" > 4 AND "name" IN ('Sehr Wichtig', 'Hoch'));
UPDATE "tasks" SET "priority_id" = 4
WHERE "priority_id" IN (SELECT "priority_id" FROM "priorities"
  WHERE "priority_id" > 4 AND "name" IN ('Sehr Hoch', 'Dringend', 'Kritisch', 'Blocker'));

-- A name outside the mapping (not in any seed) falls back to Mittel, so the
-- delete below can't fail on a foreign key.
UPDATE "tasks" SET "priority_id" = 2 WHERE "priority_id" > 4;
UPDATE "notes" SET "priority_id" = 2 WHERE "priority_id" > 4;

-- 3. IDs 1-4 get the names TaskForm shows; IDs above 4 go; new priorities
--    would continue after 4.
INSERT INTO "priorities" ("priority_id", "name") VALUES
  (1, 'Niedrig'), (2, 'Mittel'), (3, 'Hoch'), (4, 'Dringend')
ON CONFLICT ("priority_id") DO UPDATE SET "name" = EXCLUDED."name";
DELETE FROM "priorities" WHERE "priority_id" > 4;
SELECT setval(pg_get_serial_sequence('"priorities"', 'priority_id'), 4);
