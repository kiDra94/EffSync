-- T10 (GOALS.md M14): the ghost user 0, to which deleted accounts' chat
-- messages and task work are reassigned. Data only, no schema change.
-- The seeds create it as well; existing databases get it here.
INSERT INTO "users" ("user_id", "firstname", "lastname", "username", "email", "created_at")
VALUES (0, 'Gelöschter', 'Nutzer', 'geloeschter-nutzer', 'ghost@effsync.invalid', CURRENT_TIMESTAMP)
-- no conflict target: an existing username or e-mail must not abort the migration
ON CONFLICT DO NOTHING;
