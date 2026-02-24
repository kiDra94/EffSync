-- CreateTable
CREATE TABLE "email_preferences" (
    "preference_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "email_on_deadline" BOOLEAN NOT NULL DEFAULT true,
    "email_on_mention" BOOLEAN NOT NULL DEFAULT true,
    "email_on_comment" BOOLEAN NOT NULL DEFAULT true,
    "email_digest" BOOLEAN NOT NULL DEFAULT false,
    "digest_frequency" VARCHAR NOT NULL DEFAULT 'daily',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "email_log_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "recipient" VARCHAR NOT NULL,
    "subject" VARCHAR NOT NULL,
    "email_type" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'sent',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("email_log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_preferences_user_id_key" ON "email_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
