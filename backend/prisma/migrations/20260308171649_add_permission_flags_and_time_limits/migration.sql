/*
  Warnings:

  - Made the column `name` on table `permissions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_user_id_fkey";

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "flags" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "updated_at" TIMESTAMP(6),
ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_permissions" ADD COLUMN     "valid_from" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "valid_to" TIMESTAMP(6);

-- CreateIndex
CREATE INDEX "user_permissions_valid_from_valid_to_idx" ON "user_permissions"("valid_from", "valid_to");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
