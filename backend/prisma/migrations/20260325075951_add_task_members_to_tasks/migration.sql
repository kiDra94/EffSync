/*
  Warnings:

  - You are about to drop the column `accepted_at` on the `task_members` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `task_members` table. All the data in the column will be lost.
  - You are about to drop the column `invited_at` on the `task_members` table. All the data in the column will be lost.
  - You are about to drop the column `invited_by` on the `task_members` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `task_members` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `task_members` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `task_members` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "task_members" DROP CONSTRAINT "task_members_invited_by_fkey";

-- DropForeignKey
ALTER TABLE "task_members" DROP CONSTRAINT "task_members_task_id_fkey";

-- DropForeignKey
ALTER TABLE "task_members" DROP CONSTRAINT "task_members_user_id_fkey";

-- DropIndex
DROP INDEX "task_members_invited_at_idx";

-- AlterTable
ALTER TABLE "task_members" DROP COLUMN "accepted_at",
DROP COLUMN "created_at",
DROP COLUMN "invited_at",
DROP COLUMN "invited_by",
DROP COLUMN "permissions",
DROP COLUMN "role",
DROP COLUMN "updated_at",
ADD COLUMN     "joined_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "task_member_role";

-- AddForeignKey
ALTER TABLE "task_members" ADD CONSTRAINT "task_members_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_members" ADD CONSTRAINT "task_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
