-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('Superuser', 'Admin', 'Teacher', 'Student');

-- CreateEnum
CREATE TYPE "task_member_role" AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "task_members" (
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "task_member_role" NOT NULL DEFAULT 'MEMBER',
    "permissions" INTEGER NOT NULL DEFAULT 12,
    "invited_by" INTEGER,
    "invited_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "task_members_pkey" PRIMARY KEY ("task_id","user_id")
);

-- CreateIndex
CREATE INDEX "task_members_invited_at_idx" ON "task_members"("invited_at");

-- AddForeignKey
ALTER TABLE "task_members" ADD CONSTRAINT "task_members_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_members" ADD CONSTRAINT "task_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_members" ADD CONSTRAINT "task_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;
