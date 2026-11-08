import { ConflictException, Injectable, OnModuleInit } from "@nestjs/common";
import {
  AccountDeletionRegistry,
  type AccountDeletionParticipant,
} from "../../identity-access/application";
import { SchoolProfileRepository } from "./ports/school-profile.repository";

/**
 * school-organization's part of an account deletion (T10, decision H1,
 * moved here in M22): a teacher who still heads or teaches a class or has
 * lessons can't be deleted; otherwise the student and teacher profiles go
 * and supervisor references are cleared. Runs in identity-access's deletion
 * unit of work.
 */
@Injectable()
export class SchoolAccountDeletion
  implements AccountDeletionParticipant, OnModuleInit
{
  constructor(
    private readonly profiles: SchoolProfileRepository,
    private readonly registry: AccountDeletionRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async assertDeletable(userId: number): Promise<void> {
    // FK inserts (a new class teacher, a new lesson) take KEY SHARE locks on
    // the teacher row, so they wait for the deletion (review M14 (5))
    await this.profiles.lockTeacher(userId);
    if ((await this.profiles.countTeacherAssignments(userId)) > 0) {
      throw new ConflictException(
        "Die Lehrkraft ist noch Klassenvorstand, unterrichtet eine Klasse oder hat Unterrichtsstunden. Bitte zuerst neu zuweisen.",
      );
    }
  }

  async anonymizeUser(userId: number): Promise<void> {
    // references that mean nothing for a ghost
    await this.profiles.clearSupervisor(userId);
    await this.profiles.deleteProfiles(userId);
  }
}
