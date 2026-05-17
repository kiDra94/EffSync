/*
  Warnings:

  - You are about to drop the column `task_id` on the `notes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_task_id_fkey";

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "task_id";

-- CreateTable
CREATE TABLE "comments" (
    "comment_id" SERIAL NOT NULL,
    "task_id" INTEGER,
    "created_by" INTEGER,
    "content" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id")
);

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
