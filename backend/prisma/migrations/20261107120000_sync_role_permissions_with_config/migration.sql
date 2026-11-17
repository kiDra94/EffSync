-- Data migration (GOALS.md M8, decision F4): give every role the permissions of
-- src/config/role-permissions.config.ts as of this migration (a snapshot; later
-- config changes need their own migration). Inserts only missing rows, matched
-- by name and case-insensitively; existing rows and user-specific permissions
-- stay untouched. On an empty database (fresh migrate/reset) it inserts nothing,
-- and the seeds take over.
INSERT INTO "roles_permissions" ("roles_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM (VALUES
  ('Superuser', 'view_dashboard'),
  ('Superuser', 'manage_users'),
  ('Superuser', 'manage_classes'),
  ('Superuser', 'create_tasks'),
  ('Superuser', 'edit_tasks'),
  ('Superuser', 'delete_tasks'),
  ('Superuser', 'view_grades'),
  ('Superuser', 'edit_grades'),
  ('Superuser', 'view_schedules'),
  ('Superuser', 'manage_system'),
  ('Admin', 'view_dashboard'),
  ('Admin', 'manage_users'),
  ('Admin', 'manage_classes'),
  ('Admin', 'manage_system'),
  ('Admin', 'view_grades'),
  ('Admin', 'view_schedules'),
  ('Admin', 'create_tasks'),
  ('Admin', 'edit_tasks'),
  ('Admin', 'edit_grades'),
  ('Teacher', 'view_dashboard'),
  ('Teacher', 'create_tasks'),
  ('Teacher', 'edit_tasks'),
  ('Teacher', 'delete_tasks'),
  ('Teacher', 'view_grades'),
  ('Teacher', 'edit_grades'),
  ('Teacher', 'view_schedules'),
  ('Student', 'view_dashboard'),
  ('Student', 'view_grades'),
  ('Student', 'view_schedules'),
  ('Student', 'create_tasks'),
  ('Student', 'edit_tasks')
) AS config("role_name", "permission_name")
JOIN "roles" r ON lower(r."name") = lower(config."role_name")
JOIN "permissions" p ON lower(p."name") = lower(config."permission_name")
ON CONFLICT ("roles_id", "permission_id") DO NOTHING;
