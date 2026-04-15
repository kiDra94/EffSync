-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "grade" VARCHAR,
ADD COLUMN     "graded_at" TIMESTAMP(6),
ADD COLUMN     "graded_by" INTEGER;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
