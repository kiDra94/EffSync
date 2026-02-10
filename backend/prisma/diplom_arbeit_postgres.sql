-- 1. ENUMS ERSTELLEN
CREATE TYPE "task_status" AS ENUM (
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'ON_HOLD',
  'COMPLETED'
);

-- 2. TABELLEN ERSTELLEN (datetime -> timestamp)
CREATE TABLE "users" (
  "user_id" integer PRIMARY KEY,
  "firstname" varchar,
  "lastname" varchar,
  "email" varchar UNIQUE,
  "username" varchar UNIQUE,
  "password_hash" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "notes" (
  "note_id" integer PRIMARY KEY,
  "title" varchar,
  "created_by" integer,
  "description" text,
  "subject_id" integer,
  "priority_id" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "documents" (
  "document_id" integer PRIMARY KEY,
  "name" varchar,
  "file_path" varchar,
  "added_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "document_shares" (
  "document_id" integer,
  "user_id" integer,
  "created_at" timestamp DEFAULT now(),
  PRIMARY KEY ("document_id", "user_id")
);

CREATE TABLE "chat_rooms" (
  "room_id" integer PRIMARY KEY,
  "name" varchar,
  "task_id" integer,
  "class_id" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "chat_room_users" (
  "room_id" integer,
  "user_id" integer,
  "joined_at" timestamp DEFAULT now(),
  PRIMARY KEY ("room_id", "user_id")
);

CREATE TABLE "chat_messages" (
  "message_id" integer PRIMARY KEY,
  "room_id" integer,
  "user_id" integer,
  "message" text,
  "file_path" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "priorities" (
  "priority_id" integer PRIMARY KEY,
  "name" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "schedules" (
  "schedule_id" integer PRIMARY KEY,
  "name" varchar,
  "valid_from" date,
  "valid_to" date,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "rooms" (
  "room_id" integer PRIMARY KEY,
  "name" varchar,
  "type" varchar,
  "capacity" integer,
  "building" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "lesson_slots" (
  "slot_id" integer PRIMARY KEY,
  "schedule_id" integer,
  "subject_id" integer,
  "teacher_id" integer,
  "room_id" integer,
  "day_of_week" integer,
  "lesson_number" integer,
  "start_time" time,
  "end_time" time,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "subjects" (
  "subject_id" integer PRIMARY KEY,
  "name" varchar,
  "short_name" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "permissions" (
  "permission_id" integer PRIMARY KEY,
  "name" varchar
);

CREATE TABLE "tasks" (
  "task_id" integer PRIMARY KEY,
  "parent_task_id" integer,
  "title" varchar,
  "description" text,
  "status" task_status DEFAULT 'TODO',
  "progress" integer,
  "deadline" timestamp,
  "created_by" integer,
  "assigned_to" integer,
  "template_id" integer,
  "priority_id" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "task_templates" (
  "template_id" integer PRIMARY KEY,
  "name" varchar,
  "description" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "task_comments" (
  "comment_id" integer PRIMARY KEY,
  "task_id" integer,
  "user_id" integer,
  "text" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "task_activity_log" (
  "log_id" integer PRIMARY KEY,
  "task_id" integer,
  "user_id" integer,
  "action" varchar,
  "timestamp" timestamp DEFAULT now()
);

CREATE TABLE "notes_users" (
  "note_id" integer,
  "user_id" integer,
  "created_at" timestamp DEFAULT now(),
  PRIMARY KEY ("note_id", "user_id")
);

CREATE TABLE "task_documents" (
  "task_id" integer,
  "document_id" integer,
  "created_at" timestamp DEFAULT now(),
  PRIMARY KEY ("task_id", "document_id")
);

CREATE TABLE "note_documents" (
  "note_id" integer,
  "document_id" integer,
  "created_at" timestamp DEFAULT now(),
  PRIMARY KEY ("note_id", "document_id")
);

CREATE TABLE "students" (
  "student_id" integer PRIMARY KEY,
  "class_id" integer,
  "updated_at" timestamp
);

CREATE TABLE "teachers" (
  "teacher_id" integer PRIMARY KEY,
  "supervisor_id" integer,
  "updated_at" timestamp
);

CREATE TABLE "departments" (
  "department_id" integer PRIMARY KEY,
  "name" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "classes" (
  "class_id" integer PRIMARY KEY,
  "name" varchar,
  "department_id" integer,
  "head_teacher_id" integer,
  "schedule_id" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

CREATE TABLE "classes_teachers" (
  "class_id" integer,
  "teacher_id" integer,
  "assigned_at" timestamp DEFAULT now(),
  PRIMARY KEY ("class_id", "teacher_id")
);

CREATE TABLE "notifications" (
  "notification_id" integer PRIMARY KEY,
  "user_id" integer,
  "type" varchar,
  "text" varchar,
  "created_at" timestamp DEFAULT now(),
  "is_read" boolean DEFAULT false
);

CREATE TABLE "roles" (
  "role_id" integer PRIMARY KEY,
  "name" varchar
);

CREATE TABLE "user_roles" (
  "user_id" integer,
  "role_id" integer,
  "assigned_at" timestamp DEFAULT now(),
  PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "user_permissions" (
  "user_id" integer,
  "permission_id" integer,
  "assigned_at" timestamp DEFAULT now(),
  PRIMARY KEY ("user_id", "permission_id")
);

CREATE TABLE "roles_permissions" (
  "roles_id" integer,
  "permission_id" integer,
  "assigned_at" timestamp DEFAULT now(),
  PRIMARY KEY ("roles_id", "permission_id")
);

-- 3. FOREIGN KEYS (KORRIGIERT)
ALTER TABLE "notes" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id");
ALTER TABLE "notes" ADD FOREIGN KEY ("subject_id") REFERENCES "subjects" ("subject_id");
ALTER TABLE "notes" ADD FOREIGN KEY ("priority_id") REFERENCES "priorities" ("priority_id");
ALTER TABLE "documents" ADD FOREIGN KEY ("added_by") REFERENCES "users" ("user_id");
ALTER TABLE "document_shares" ADD FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id");
ALTER TABLE "document_shares" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "chat_rooms" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id");
ALTER TABLE "chat_rooms" ADD FOREIGN KEY ("class_id") REFERENCES "classes" ("class_id");
ALTER TABLE "chat_room_users" ADD FOREIGN KEY ("room_id") REFERENCES "chat_rooms" ("room_id");
ALTER TABLE "chat_room_users" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "chat_messages" ADD FOREIGN KEY ("room_id") REFERENCES "chat_rooms" ("room_id");
ALTER TABLE "chat_messages" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "lesson_slots" ADD FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("schedule_id");
ALTER TABLE "lesson_slots" ADD FOREIGN KEY ("subject_id") REFERENCES "subjects" ("subject_id");
ALTER TABLE "lesson_slots" ADD FOREIGN KEY ("teacher_id") REFERENCES "teachers" ("teacher_id");
ALTER TABLE "lesson_slots" ADD FOREIGN KEY ("room_id") REFERENCES "rooms" ("room_id");
ALTER TABLE "tasks" ADD FOREIGN KEY ("parent_task_id") REFERENCES "tasks" ("task_id");
ALTER TABLE "tasks" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("user_id");
ALTER TABLE "tasks" ADD FOREIGN KEY ("assigned_to") REFERENCES "users" ("user_id");
ALTER TABLE "tasks" ADD FOREIGN KEY ("template_id") REFERENCES "task_templates" ("template_id");
ALTER TABLE "tasks" ADD FOREIGN KEY ("priority_id") REFERENCES "priorities" ("priority_id");
ALTER TABLE "task_comments" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id");
ALTER TABLE "task_comments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "task_activity_log" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id");
ALTER TABLE "task_activity_log" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "notes_users" ADD FOREIGN KEY ("note_id") REFERENCES "notes" ("note_id");
ALTER TABLE "notes_users" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "task_documents" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id");
ALTER TABLE "task_documents" ADD FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id");
ALTER TABLE "note_documents" ADD FOREIGN KEY ("note_id") REFERENCES "notes" ("note_id");
ALTER TABLE "note_documents" ADD FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id");
ALTER TABLE "students" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("user_id");
ALTER TABLE "students" ADD FOREIGN KEY ("class_id") REFERENCES "classes" ("class_id");
ALTER TABLE "teachers" ADD FOREIGN KEY ("teacher_id") REFERENCES "users" ("user_id");
ALTER TABLE "teachers" ADD FOREIGN KEY ("supervisor_id") REFERENCES "users" ("user_id");
ALTER TABLE "classes" ADD FOREIGN KEY ("department_id") REFERENCES "departments" ("department_id");
ALTER TABLE "classes" ADD FOREIGN KEY ("head_teacher_id") REFERENCES "teachers" ("teacher_id");
ALTER TABLE "classes" ADD FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("schedule_id");
ALTER TABLE "classes_teachers" ADD FOREIGN KEY ("class_id") REFERENCES "classes" ("class_id");
ALTER TABLE "classes_teachers" ADD FOREIGN KEY ("teacher_id") REFERENCES "teachers" ("teacher_id");
ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "user_roles" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id");
ALTER TABLE "user_permissions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id");
ALTER TABLE "user_permissions" ADD FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id"); -- KORRIGIERT
ALTER TABLE "roles_permissions" ADD FOREIGN KEY ("roles_id") REFERENCES "roles" ("role_id");
ALTER TABLE "roles_permissions" ADD FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id"); -- KORRIGIERT
