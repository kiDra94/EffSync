/*
  Warnings:

  - The primary key for the `chat_room_users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[direct_chat_hash]` on the table `chat_rooms` will be added. If there are existing duplicate values, this will fail.
  - Made the column `room_id` on table `chat_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `chat_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `message` on table `chat_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `chat_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `joined_at` on table `chat_room_users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `chat_rooms` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by` on table `chat_rooms` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "room_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "message" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "chat_room_users" DROP CONSTRAINT "chat_room_users_pkey",
ALTER COLUMN "joined_at" SET NOT NULL,
ALTER COLUMN "left_at" DROP DEFAULT,
ADD CONSTRAINT "chat_room_users_pkey" PRIMARY KEY ("room_id", "user_id", "joined_at");

-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN     "direct_chat_hash" VARCHAR(50),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_by" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_direct_chat_hash_key" ON "chat_rooms"("direct_chat_hash");
