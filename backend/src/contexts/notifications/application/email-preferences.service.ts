import { Injectable } from "@nestjs/common";
import { EmailPreferenceRepository } from "./ports/email.repository";
import type { EmailPreferenceChanges } from "./ports/notification-records";

/**
 * A user's e-mail preferences (T46); created with the schema's defaults
 * (all mails on, no digest, daily) on the first read.
 */
@Injectable()
export class EmailPreferencesService {
  constructor(private readonly preferences: EmailPreferenceRepository) {}

  get(userId: number) {
    return this.preferences.upsert(userId, {});
  }

  update(userId: number, changes: EmailPreferenceChanges) {
    return this.preferences.upsert(userId, changes);
  }
}
