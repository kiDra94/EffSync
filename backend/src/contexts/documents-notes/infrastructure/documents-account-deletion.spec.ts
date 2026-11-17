import { AccountDeletionRegistry } from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { DocumentsAccountDeletion } from "./documents-account-deletion";

// T10, decision H1 (M14), moved here in M19: documents-notes' part of an
// account deletion, in identity-access's unit of work
describe("DocumentsAccountDeletion", () => {
  const table = () => ({ updateMany: jest.fn(), deleteMany: jest.fn() });
  const tx = {
    documents: table(),
    document_shares: table(),
    notes: table(),
    notes_users: table(),
    note_documents: table(),
  };
  const registry = new AccountDeletionRegistry();
  const participant = new DocumentsAccountDeletion(
    { client: () => tx } as unknown as PrismaUnitOfWork,
    registry,
  );
  const privateDocuments = {
    added_by: 5,
    task_documents: { none: {} },
  };

  beforeAll(async () => {
    participant.onModuleInit();
    await registry.anonymizeUser(5);
  });

  it.each([
    ["documents", "added_by"],
    ["documents", "graded_by"],
  ] as const)("moves %s.%s to the ghost user", (name, column) => {
    expect(tx[name].updateMany).toHaveBeenCalledWith({
      where: { [column]: 5 },
      data: { [column]: 0 },
    });
  });

  it("deletes the user's own notes and what was shared with them", () => {
    const ownNotes = { where: { notes: { created_by: 5 } } };
    expect(tx.note_documents.deleteMany).toHaveBeenCalledWith(ownNotes);
    expect(tx.notes_users.deleteMany).toHaveBeenCalledWith(ownNotes);
    expect(tx.notes.deleteMany).toHaveBeenCalledWith({
      where: { created_by: 5 },
    });
    for (const name of ["document_shares", "notes_users"] as const) {
      expect(tx[name].deleteMany).toHaveBeenCalledWith({
        where: { user_id: 5 },
      });
    }
  });

  // review M14 (4): only uploads attached to a task stay, under the ghost user
  it("deletes the user's uploads that belong to no task, with their links", () => {
    expect(tx.document_shares.deleteMany).toHaveBeenCalledWith({
      where: { documents: privateDocuments },
    });
    expect(tx.note_documents.deleteMany).toHaveBeenCalledWith({
      where: { documents: privateDocuments },
    });
    expect(tx.documents.deleteMany).toHaveBeenCalledWith({
      where: privateDocuments,
    });
    expect(tx.documents.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.documents.updateMany.mock.invocationCallOrder[0],
    );
  });
});
