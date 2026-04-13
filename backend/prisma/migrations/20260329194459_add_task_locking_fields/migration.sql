-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "is_locked" BOOLEAN DEFAULT false,
ADD COLUMN     "locked_reason" VARCHAR,
ADD COLUMN     "locked_until" TIMESTAMP(6);
