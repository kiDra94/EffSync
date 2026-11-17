import { AccountDeletionRegistry } from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { NotificationsAccountDeletion } from "./notifications-account-deletion";

// T10, decision H1 (M14), moved here in M23: notifications' part of an
// account deletion, in identity-access's unit of work
describe("NotificationsAccountDeletion", () => {
  const tx = {
    $executeRaw: jest.fn(),
    notifications: { deleteMany: jest.fn() },
    users: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        firstname: "Lea",
        lastname: "Verlassen",
        username: "lverlassen",
      }),
    },
  };
  const registry = new AccountDeletionRegistry();
  new NotificationsAccountDeletion(
    { client: () => tx } as unknown as PrismaUnitOfWork,
    registry,
  ).onModuleInit();

  beforeAll(async () => {
    await registry.anonymizeUser(5);
  });

  it("deletes the user's own notifications", () => {
    expect(tx.notifications.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 5 },
    });
  });

  // review M14 (3): the chat notifications of other members carry the name
  it("replaces the name in other members' chat notifications", () => {
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const [, ...values] = tx.$executeRaw.mock.calls[0] as unknown[];
    expect(values).toEqual(
      expect.arrayContaining(["💬 Lea Verlassen:", "💬 Gelöschter Nutzer:"]),
    );
  });
});
