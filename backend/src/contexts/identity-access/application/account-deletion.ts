import { Injectable } from "@nestjs/common";

/**
 * A context that owns rows referring to a user (M15 step 6, rule 4): when
 * the account is deleted it moves its shared content to the ghost user and
 * deletes the personal rows, inside the deletion's unit of work. It may
 * refuse the deletion first (M22: a teacher still assigned to classes).
 */
export interface AccountDeletionParticipant {
  assertDeletable?(userId: number): Promise<void>;
  anonymizeUser(userId: number): Promise<void>;
}

/**
 * The participants of an account deletion. Contexts register themselves at
 * startup, so identity-access doesn't depend on them.
 */
@Injectable()
export class AccountDeletionRegistry {
  private readonly participants: AccountDeletionParticipant[] = [];

  register(participant: AccountDeletionParticipant) {
    this.participants.push(participant);
  }

  /** Throws if a participant refuses the deletion. */
  async assertDeletable(userId: number) {
    for (const participant of this.participants) {
      await participant.assertDeletable?.(userId);
    }
  }

  async anonymizeUser(userId: number) {
    for (const participant of this.participants) {
      await participant.anonymizeUser(userId);
    }
  }
}
