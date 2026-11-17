import { PrismaUserRepository } from "./prisma-user.repository";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { GHOST_USER_ID } from "../../domain/ghost-user";

// decision H1 (M14): which rows move to the ghost user, which become NULL and
// which are deleted with the account; runs in the caller's unit of work
describe("PrismaUserRepository.anonymizeAndDelete", () => {
  const table = () => ({ updateMany: jest.fn(), deleteMany: jest.fn() });
  const tx = {
    tasks: table(),
    comments: table(),
    task_grade: table(),
    task_activity_log: table(),
    task_templates: table(),
    user_roles: table(),
    users: {
      delete: jest.fn().mockResolvedValue({ user_id: 5 }),
    },
  };
  const repository = new PrismaUserRepository(
    {} as PrismaService,
    { client: () => tx } as unknown as PrismaUnitOfWork,
  );

  beforeAll(async () => {
    await repository.anonymizeAndDelete(5);
  });

  it("uses user id 0 for the ghost user", () => {
    expect(GHOST_USER_ID).toBe(0);
  });

  it("deletes the personal rows", () => {
    expect(tx.user_roles.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 5 },
    });
  });

  it("deletes the user row last", () => {
    expect(tx.users.delete).toHaveBeenCalledWith({ where: { user_id: 5 } });
    const deleteOrder = tx.users.delete.mock.invocationCallOrder[0];
    expect(tx.user_roles.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      deleteOrder,
    );
  });
});

// review M14 (5): the row locks serialize the delete with concurrent
// assignments (FK inserts take KEY SHARE locks) and with a second delete
describe("PrismaUserRepository.lockForDeletion", () => {
  // the teacher row is school-organization's lock since M22
  it("locks the user row, then reads the user", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      users: { findUnique: jest.fn().mockResolvedValue({ user_id: 5 }) },
    };
    const repository = new PrismaUserRepository(
      {} as PrismaService,
      { client: () => tx } as unknown as PrismaUnitOfWork,
    );

    await expect(repository.lockForDeletion(5)).resolves.toEqual({
      user_id: 5,
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = (tx.$queryRaw.mock.calls as [TemplateStringsArray][])
      .map(([strings]) => strings.join("?"))
      .join(" ");
    expect(sql).toMatch(/FROM "users".*FOR UPDATE/);
  });
});

// M14: the ghost user is no one to chat with or to administer
describe("PrismaUserRepository user lists", () => {
  it.each(["findAllForChat", "findAllWithAccess"] as const)(
    "%s leaves out the ghost user",
    async (method) => {
      const prisma = { users: { findMany: jest.fn().mockResolvedValue([]) } };
      await new PrismaUserRepository(prisma as unknown as PrismaService)[
        method
      ]();

      expect(prisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: { not: GHOST_USER_ID } },
        }),
      );
    },
  );
});
