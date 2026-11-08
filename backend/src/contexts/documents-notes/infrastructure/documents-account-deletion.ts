import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  AccountDeletionRegistry,
  GHOST_USER_ID,
  type AccountDeletionParticipant,
} from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";

/**
 * documents-notes' part of an account deletion (T10, decision H1, moved
 * here in M19): the user's notes and private uploads are deleted, uploads
 * that belong to a task and grades stay under the ghost user. Runs in
 * identity-access's deletion unit of work.
 */
@Injectable()
export class DocumentsAccountDeletion
  implements AccountDeletionParticipant, OnModuleInit
{
  constructor(
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly registry: AccountDeletionRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async anonymizeUser(userId: number): Promise<void> {
    const tx = this.unitOfWork.client();

    // the user's own notes, with their shares and document links
    const ownNotes = { where: { notes: { created_by: userId } } };
    await tx.note_documents.deleteMany(ownNotes);
    await tx.notes_users.deleteMany(ownNotes);
    await tx.notes.deleteMany({ where: { created_by: userId } });

    // uploads that belong to no task are private files: deleted
    const privateDocuments = {
      added_by: userId,
      task_documents: { none: {} },
    };
    await tx.document_shares.deleteMany({
      where: { documents: privateDocuments },
    });
    await tx.note_documents.deleteMany({
      where: { documents: privateDocuments },
    });
    await tx.documents.deleteMany({ where: privateDocuments });

    // task submissions and grades stay, under the ghost user
    await tx.documents.updateMany({
      where: { added_by: userId },
      data: { added_by: GHOST_USER_ID },
    });
    await tx.documents.updateMany({
      where: { graded_by: userId },
      data: { graded_by: GHOST_USER_ID },
    });

    // what was shared with the user
    const ownRows = { where: { user_id: userId } };
    await tx.document_shares.deleteMany(ownRows);
    await tx.notes_users.deleteMany(ownRows);
  }
}
