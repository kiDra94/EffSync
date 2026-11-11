-- T99 (decision I4, M38): the members' rights on their task; the existing
-- memberships get READ (4) through the default
-- AlterTable
ALTER TABLE "task_members" ADD COLUMN     "flags" INTEGER NOT NULL DEFAULT 4;
