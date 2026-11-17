-- T101 (07_…:82, decision Q20, GOALS.md M33): every task has a creator,
-- enforced by the database. Tasks without one go to the ghost user 0 (M14),
-- who is created here if a database lacks it, as in 20261107160000.
INSERT INTO "users" ("user_id", "firstname", "lastname", "username", "email", "created_at")
VALUES (0, 'Gelöschter', 'Nutzer', 'geloeschter-nutzer', 'ghost@effsync.invalid', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- review M33: ON CONFLICT also skips the insert when another account holds
-- the ghost's username or e-mail; then stop with a clear message instead of
-- a foreign-key error or a database without user 0
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "users" WHERE "user_id" = 0) THEN
    RAISE EXCEPTION 'ghost user 0 is missing and could not be created: another account holds the username geloeschter-nutzer or the e-mail ghost@effsync.invalid; free them, then deploy again';
  END IF;
END $$;

UPDATE "tasks" SET "created_by" = 0 WHERE "created_by" IS NULL;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "created_by" SET NOT NULL;
