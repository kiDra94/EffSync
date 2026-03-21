-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
