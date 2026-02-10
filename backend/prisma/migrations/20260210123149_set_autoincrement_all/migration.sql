-- AlterTable
CREATE SEQUENCE chat_messages_message_id_seq;
ALTER TABLE "chat_messages" ALTER COLUMN "message_id" SET DEFAULT nextval('chat_messages_message_id_seq');
ALTER SEQUENCE chat_messages_message_id_seq OWNED BY "chat_messages"."message_id";

-- AlterTable
CREATE SEQUENCE chat_rooms_room_id_seq;
ALTER TABLE "chat_rooms" ALTER COLUMN "room_id" SET DEFAULT nextval('chat_rooms_room_id_seq');
ALTER SEQUENCE chat_rooms_room_id_seq OWNED BY "chat_rooms"."room_id";

-- AlterTable
CREATE SEQUENCE classes_class_id_seq;
ALTER TABLE "classes" ALTER COLUMN "class_id" SET DEFAULT nextval('classes_class_id_seq');
ALTER SEQUENCE classes_class_id_seq OWNED BY "classes"."class_id";

-- AlterTable
CREATE SEQUENCE departments_department_id_seq;
ALTER TABLE "departments" ALTER COLUMN "department_id" SET DEFAULT nextval('departments_department_id_seq');
ALTER SEQUENCE departments_department_id_seq OWNED BY "departments"."department_id";

-- AlterTable
CREATE SEQUENCE documents_document_id_seq;
ALTER TABLE "documents" ALTER COLUMN "document_id" SET DEFAULT nextval('documents_document_id_seq');
ALTER SEQUENCE documents_document_id_seq OWNED BY "documents"."document_id";

-- AlterTable
CREATE SEQUENCE lesson_slots_slot_id_seq;
ALTER TABLE "lesson_slots" ALTER COLUMN "slot_id" SET DEFAULT nextval('lesson_slots_slot_id_seq');
ALTER SEQUENCE lesson_slots_slot_id_seq OWNED BY "lesson_slots"."slot_id";

-- AlterTable
CREATE SEQUENCE notes_note_id_seq;
ALTER TABLE "notes" ALTER COLUMN "note_id" SET DEFAULT nextval('notes_note_id_seq');
ALTER SEQUENCE notes_note_id_seq OWNED BY "notes"."note_id";

-- AlterTable
CREATE SEQUENCE notifications_notification_id_seq;
ALTER TABLE "notifications" ALTER COLUMN "notification_id" SET DEFAULT nextval('notifications_notification_id_seq');
ALTER SEQUENCE notifications_notification_id_seq OWNED BY "notifications"."notification_id";

-- AlterTable
CREATE SEQUENCE permissions_permission_id_seq;
ALTER TABLE "permissions" ALTER COLUMN "permission_id" SET DEFAULT nextval('permissions_permission_id_seq');
ALTER SEQUENCE permissions_permission_id_seq OWNED BY "permissions"."permission_id";

-- AlterTable
CREATE SEQUENCE priorities_priority_id_seq;
ALTER TABLE "priorities" ALTER COLUMN "priority_id" SET DEFAULT nextval('priorities_priority_id_seq');
ALTER SEQUENCE priorities_priority_id_seq OWNED BY "priorities"."priority_id";

-- AlterTable
CREATE SEQUENCE roles_role_id_seq;
ALTER TABLE "roles" ALTER COLUMN "role_id" SET DEFAULT nextval('roles_role_id_seq');
ALTER SEQUENCE roles_role_id_seq OWNED BY "roles"."role_id";

-- AlterTable
CREATE SEQUENCE rooms_room_id_seq;
ALTER TABLE "rooms" ALTER COLUMN "room_id" SET DEFAULT nextval('rooms_room_id_seq');
ALTER SEQUENCE rooms_room_id_seq OWNED BY "rooms"."room_id";

-- AlterTable
CREATE SEQUENCE schedules_schedule_id_seq;
ALTER TABLE "schedules" ALTER COLUMN "schedule_id" SET DEFAULT nextval('schedules_schedule_id_seq');
ALTER SEQUENCE schedules_schedule_id_seq OWNED BY "schedules"."schedule_id";

-- AlterTable
CREATE SEQUENCE subjects_subject_id_seq;
ALTER TABLE "subjects" ALTER COLUMN "subject_id" SET DEFAULT nextval('subjects_subject_id_seq');
ALTER SEQUENCE subjects_subject_id_seq OWNED BY "subjects"."subject_id";

-- AlterTable
CREATE SEQUENCE task_activity_log_log_id_seq;
ALTER TABLE "task_activity_log" ALTER COLUMN "log_id" SET DEFAULT nextval('task_activity_log_log_id_seq');
ALTER SEQUENCE task_activity_log_log_id_seq OWNED BY "task_activity_log"."log_id";

-- AlterTable
CREATE SEQUENCE task_comments_comment_id_seq;
ALTER TABLE "task_comments" ALTER COLUMN "comment_id" SET DEFAULT nextval('task_comments_comment_id_seq');
ALTER SEQUENCE task_comments_comment_id_seq OWNED BY "task_comments"."comment_id";

-- AlterTable
CREATE SEQUENCE task_templates_template_id_seq;
ALTER TABLE "task_templates" ALTER COLUMN "template_id" SET DEFAULT nextval('task_templates_template_id_seq');
ALTER SEQUENCE task_templates_template_id_seq OWNED BY "task_templates"."template_id";

-- AlterTable
CREATE SEQUENCE tasks_task_id_seq;
ALTER TABLE "tasks" ALTER COLUMN "task_id" SET DEFAULT nextval('tasks_task_id_seq');
ALTER SEQUENCE tasks_task_id_seq OWNED BY "tasks"."task_id";
