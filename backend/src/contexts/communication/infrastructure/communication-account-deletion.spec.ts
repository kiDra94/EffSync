import { AccountDeletionRegistry } from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { CommunicationAccountDeletion } from "./communication-account-deletion";

// T10, decision H1 (M14), moved here in M20: communication's part of an
// account deletion, in identity-access's unit of work
describe("CommunicationAccountDeletion", () => {
  const table = () => ({ updateMany: jest.fn(), deleteMany: jest.fn() });
  const tx = {
    chat_messages: table(),
    chat_rooms: table(),
    chat_room_users: table(),
  };
  const registry = new AccountDeletionRegistry();
  const participant = new CommunicationAccountDeletion(
    { client: () => tx } as unknown as PrismaUnitOfWork,
    registry,
  );

  beforeAll(async () => {
    participant.onModuleInit();
    await registry.anonymizeUser(5);
  });

  it.each([
    ["chat_messages", "user_id"],
    ["chat_rooms", "created_by"],
  ] as const)("moves %s.%s to the ghost user", (name, column) => {
    expect(tx[name].updateMany).toHaveBeenCalledWith({
      where: { [column]: 5 },
      data: { [column]: 0 },
    });
  });

  it("deletes the user's memberships", () => {
    expect(tx.chat_room_users.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 5 },
    });
  });
});
