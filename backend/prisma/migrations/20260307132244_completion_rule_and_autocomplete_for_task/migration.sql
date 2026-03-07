-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "auto_complete" BOOLEAN,
ADD COLUMN     "completion_rule" JSONB;
