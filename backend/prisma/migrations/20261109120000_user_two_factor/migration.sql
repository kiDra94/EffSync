-- T31 (decision Q8d, M32): the TOTP secret of a user, encrypted; additive
-- CreateTable
CREATE TABLE "user_two_factor" (
    "user_id" INTEGER NOT NULL,
    "secret_encrypted" VARCHAR NOT NULL,
    "enabled_at" TIMESTAMP(6),

    CONSTRAINT "user_two_factor_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_two_factor" ADD CONSTRAINT "user_two_factor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
