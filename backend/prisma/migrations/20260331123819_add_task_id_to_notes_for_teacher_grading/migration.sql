-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "task_id" INTEGER;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
