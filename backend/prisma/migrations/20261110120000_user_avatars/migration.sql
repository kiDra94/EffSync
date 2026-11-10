-- T47 (decision Q8c, M27): the profile picture per user; additive
-- CreateTable
CREATE TABLE "user_avatars" (
    "user_id" INTEGER NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
