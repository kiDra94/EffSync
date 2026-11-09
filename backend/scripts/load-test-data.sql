-- Scaled data for the load test and EXPLAIN ANALYZE (GOALS.md M30).
-- Only for the test database, after the test seed (users 1-8, rooms 1-2):
--   docker exec -i backend-postgres-test-1 \
--     psql -U postgres -d effsync_test < scripts/load-test-data.sql
-- Adds 20,000 tasks (a third of them subtasks), their members, 20,000
-- activity-log entries, 20,000 notifications and 20,000 chat messages.

-- without this psql reports the guard's exception and runs the inserts anyway
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() NOT LIKE '%\_test' THEN
    RAISE EXCEPTION 'refusing to fill % (not a *_test database)', current_database();
  END IF;
END $$;

INSERT INTO tasks (title, description, status, progress, deadline, created_by, assigned_to, priority_id, created_at)
SELECT
  'Lastaufgabe ' || n,
  'Beschreibung ' || n,
  (ARRAY['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']::task_status[])[1 + n % 4],
  CASE WHEN n % 4 = 3 THEN 100 ELSE (n % 10) * 10 END,
  now() + ((n % 60) - 20) * interval '1 day',
  2 + n % 2,          -- the two teachers
  4 + n % 5,          -- the five students
  1 + n % 4,
  now() - (n % 180) * interval '1 day'
FROM generate_series(1, 20000) AS n;

-- every third task becomes a subtask of the task before it
UPDATE tasks t SET parent_task_id = t.task_id - 1
WHERE t.title LIKE 'Lastaufgabe %'
  AND (substring(t.title FROM 13)::int) % 3 = 0;

INSERT INTO task_members (task_id, user_id)
SELECT task_id, 4 + task_id % 5 FROM tasks WHERE title LIKE 'Lastaufgabe %'
ON CONFLICT DO NOTHING;

INSERT INTO task_activity_log (task_id, user_id, action, timestamp)
SELECT task_id, created_by, 'Task created', created_at
FROM tasks WHERE title LIKE 'Lastaufgabe %';

INSERT INTO notifications (user_id, type, text, is_read)
SELECT 1 + n % 8, 'info', 'Lastnachricht ' || n, n % 3 = 0
FROM generate_series(1, 20000) AS n;

INSERT INTO chat_messages (room_id, user_id, message)
SELECT 2, 2 + n % 7, 'Lastnachricht ' || n
FROM generate_series(1, 20000) AS n;

ANALYZE;
