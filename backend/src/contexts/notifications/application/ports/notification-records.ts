/** Row shapes of the notifications ports (Prisma types, type-only, G1). */
import type { Prisma } from "@prisma/client";

export type NotificationRecord = Prisma.notificationsGetPayload<object>;
export type EmailPreferenceRecord = Prisma.email_preferencesGetPayload<object>;

export interface NewNotification {
  user_id: number;
  type: string;
  text: string;
  is_read?: boolean;
}

/** What a user changes in their e-mail preferences. */
export interface EmailPreferenceChanges {
  email_on_deadline?: boolean;
  email_on_mention?: boolean;
  email_on_comment?: boolean;
  email_digest?: boolean;
  digest_frequency?: "daily" | "weekly" | "monthly";
}

/** One line of email_logs. */
export interface EmailLogEntry {
  user_id: number;
  recipient: string;
  subject: string;
  email_type: string;
  status: "sent" | "failed";
  error_message?: string;
}
