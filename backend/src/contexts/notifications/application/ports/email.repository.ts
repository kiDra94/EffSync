import type {
  EmailLogEntry,
  EmailPreferenceChanges,
  EmailPreferenceRecord,
} from "./notification-records";

/** The log of sent and failed e-mails (port). */
export abstract class EmailLogRepository {
  abstract log(entry: EmailLogEntry): Promise<void>;
  /** Whether a mail of this type was sent to the user since the time. */
  abstract sentSince(
    userId: number,
    emailType: string,
    since: Date,
  ): Promise<boolean>;
}

/** A user's e-mail preferences (port). */
export abstract class EmailPreferenceRepository {
  abstract find(userId: number): Promise<EmailPreferenceRecord | null>;
  /**
   * The user's preferences with the changes, created with the schema's
   * defaults if missing; one upsert, so two first requests don't collide.
   */
  abstract upsert(
    userId: number,
    changes: EmailPreferenceChanges,
  ): Promise<EmailPreferenceRecord>;
}
