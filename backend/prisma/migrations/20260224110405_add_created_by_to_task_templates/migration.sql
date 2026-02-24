/*
  Warnings:

  - Added the required column `created_by` to the `task_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "task_templates" ADD COLUMN     "created_by" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
