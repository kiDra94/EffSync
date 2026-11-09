-- Scaled data for the load test and EXPLAIN ANALYZE (GOALS.md M30, M37).
-- Only for the test database, after the test seed (users 1-8, rooms 1-2):
--   docker exec -i backend-postgres-test-1 \
--     psql -U postgres -d effsync_test < scripts/load-test-data.sql
-- A school-sized spread (M37): 750 students (the 5 of the seed and 745 more)
-- and 40 teachers (2 and 38). 20,000 tasks (a third of them subtasks), each
-- created by a teacher, assigned to one student, with three student members
-- (group work), 20,000 activity-log entries, 20,000 notifications over all
-- users and 20,000 chat messages. A student sees about 200 tasks.
-- (M30 measured the same volume with all tasks on the 5 seed students; one
-- of them saw 9,336 tasks: see PROGRESS.md M37.)
-- The new users have no password, so nobody can sign in as them.

-- without this psql reports the guard's exception and runs the inserts anyway
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() NOT LIKE '%\_test' THEN
    RAISE EXCEPTION 'refusing to fill % (not a *_test database)', current_database();
  END IF;
END $$;

INSERT INTO users (firstname, lastname, email, username, password_hash)
SELECT 'Last', 'Schüler ' || n, 'last.schueler' || n || '@load.test', 'lastschueler' || n, NULL
FROM generate_series(1, 745) AS n;
INSERT INTO users (firstname, lastname, email, username, password_hash)
SELECT 'Last', 'Lehrer ' || n, 'last.lehrer' || n || '@load.test', 'lastlehrer' || n, NULL
FROM generate_series(1, 38) AS n;

-- roles of the test seed: Student 2, Teacher 3
INSERT INTO user_roles (user_id, role_id)
SELECT user_id, 2 FROM users WHERE username LIKE 'lastschueler%';
INSERT INTO students (student_id)
SELECT user_id FROM users WHERE username LIKE 'lastschueler%';
INSERT INTO user_roles (user_id, role_id)
SELECT user_id, 3 FROM users WHERE username LIKE 'lastlehrer%';
INSERT INTO teachers (teacher_id)
SELECT user_id FROM users WHERE username LIKE 'lastlehrer%';

-- numbered, so the tasks below can pick them by n
CREATE TEMP TABLE load_students AS
  SELECT (row_number() OVER (ORDER BY user_id) - 1)::int AS i, user_id FROM users
  WHERE user_id BETWEEN 4 AND 8 OR username LIKE 'lastschueler%';
CREATE TEMP TABLE load_teachers AS
  SELECT (row_number() OVER (ORDER BY user_id) - 1)::int AS i, user_id FROM users
  WHERE user_id IN (2, 3) OR username LIKE 'lastlehrer%';
CREATE TEMP TABLE load_users AS
  SELECT (row_number() OVER (ORDER BY user_id) - 1)::int AS i, user_id FROM users
  WHERE user_id > 0;

DO $$
BEGIN
  IF (SELECT count(*) FROM load_students) <> 750
     OR (SELECT count(*) FROM load_teachers) <> 40 THEN
    RAISE EXCEPTION 'expected 750 students and 40 teachers after the seed';
  END IF;
END $$;

INSERT INTO tasks (title, description, status, progress, deadline, created_by, assigned_to, priority_id, created_at)
SELECT
  'Lastaufgabe ' || n,
  'Beschreibung ' || n,
  (ARRAY['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']::task_status[])[1 + n % 4],
  CASE WHEN n % 4 = 3 THEN 100 ELSE (n % 10) * 10 END,
  now() + ((n % 60) - 20) * interval '1 day',
  lt.user_id,
  -- 7 and 750 share no factor, so every student gets as many tasks
  ls.user_id,
  1 + n % 4,
  now() - (n % 180) * interval '1 day'
FROM generate_series(1, 20000) AS n
JOIN load_teachers lt ON lt.i = n % 40
JOIN load_students ls ON ls.i = (n * 7) % 750;

-- every third task becomes a subtask of the task before it
UPDATE tasks t SET parent_task_id = t.task_id - 1
WHERE t.title LIKE 'Lastaufgabe %'
  AND (substring(t.title FROM 13)::int) % 3 = 0;

-- three more students work on each task
INSERT INTO task_members (task_id, user_id)
SELECT t.task_id, ls.user_id
FROM tasks t
CROSS JOIN generate_series(1, 3) AS j
JOIN load_students ls ON ls.i = (t.task_id * 11 + j * 251) % 750
WHERE t.title LIKE 'Lastaufgabe %'
ON CONFLICT DO NOTHING;

INSERT INTO task_activity_log (task_id, user_id, action, timestamp)
SELECT task_id, created_by, 'Task created', created_at
FROM tasks WHERE title LIKE 'Lastaufgabe %';

INSERT INTO notifications (user_id, type, text, is_read)
SELECT lu.user_id, 'info', 'Lastnachricht ' || n, n % 3 = 0
FROM generate_series(1, 20000) AS n
JOIN load_users lu ON lu.i = n % (SELECT count(*) FROM load_users);

INSERT INTO chat_messages (room_id, user_id, message)
SELECT 2, 2 + n % 7, 'Lastnachricht ' || n
FROM generate_series(1, 20000) AS n;

ANALYZE;
