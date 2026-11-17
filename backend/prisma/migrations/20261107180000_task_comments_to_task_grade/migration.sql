-- Decision Q16 (GOALS.md M15): discussion comments live in "comments";
-- "task_comments" becomes "task_grade" for teachers' grading remarks.
-- A rename, not drop and create, so no row is lost on the way.
ALTER TABLE "task_comments" RENAME TO "task_grade";
ALTER TABLE "task_grade" RENAME CONSTRAINT "task_comments_pkey" TO "task_grade_pkey";
ALTER TABLE "task_grade" RENAME CONSTRAINT "task_comments_task_id_fkey" TO "task_grade_task_id_fkey";
ALTER TABLE "task_grade" RENAME CONSTRAINT "task_comments_user_id_fkey" TO "task_grade_user_id_fkey";
ALTER SEQUENCE "task_comments_comment_id_seq" RENAME TO "task_grade_comment_id_seq";

-- Every existing row was a discussion comment: move them to "comments"
INSERT INTO "comments" ("task_id", "created_by", "content", "created_at", "updated_at")
SELECT "task_id", "user_id", "text", "created_at", "updated_at"
FROM "task_grade"
ORDER BY "comment_id";

DELETE FROM "task_grade";
