import { PrismaUserRepository } from "./prisma-user.repository";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { GHOST_USER_ID } from "../../domain/ghost-user";

// decision H1 (M14): which rows move to the ghost user, which become NULL and
// which are deleted with the account; runs in the caller's unit of work
describe("PrismaUserRepository.anonymizeAndDelete", () => {
  const table = () => ({ updateMany: jest.fn(), deleteMany: jest.fn() });
  const tx = {
    $executeRaw: jest.fn(),
    chat_messages: table(),
    tasks: table(),
    comments: table(),
    task_grade: table(),
    chat_rooms: table(),
    task_activity_log: table(),
    task_templates: table(),
    teachers: table(),
    user_roles: table(),
    chat_room_users: table(),
    notifications: table(),
    students: table(),
    users: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        user_id: 5,
        firstname: "Lea",
        lastname: "Verlassen",
        username: "lverlassen",
      }),
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

  it.each([
    ["chat_messages", "user_id"],
    ["chat_rooms", "created_by"],
  ] as const)("moves %s.%s to the ghost user", (name, column) => {
    expect(tx[name].updateMany).toHaveBeenCalledWith({
      where: { [column]: 5 },
      data: { [column]: 0 },
    });
  });

  it.each([["teachers", "supervisor_id"]] as const)(
    "sets %s.%s to NULL",
    (name, column) => {
      expect(tx[name].updateMany).toHaveBeenCalledWith({
        where: { [column]: 5 },
        data: { [column]: null },
      });
    },
  );

  it("deletes the personal rows", () => {
    for (const name of [
      "user_roles",
      "chat_room_users",
      "notifications",
    ] as const) {
      expect(tx[name].deleteMany).toHaveBeenCalledWith({
        where: { user_id: 5 },
      });
    }
    expect(tx.students.deleteMany).toHaveBeenCalledWith({
      where: { student_id: 5 },
    });
    expect(tx.teachers.deleteMany).toHaveBeenCalledWith({
      where: { teacher_id: 5 },
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

  it("deletes the user row last", () => {
    expect(tx.users.delete).toHaveBeenCalledWith({ where: { user_id: 5 } });
    const deleteOrder = tx.users.delete.mock.invocationCallOrder[0];
    expect(
      Math.max(
        ...tx.chat_messages.updateMany.mock.invocationCallOrder,
        ...tx.teachers.deleteMany.mock.invocationCallOrder,
        ...tx.$executeRaw.mock.invocationCallOrder,
      ),
    ).toBeLessThan(deleteOrder);
  });
});

// review M14 (5): the row locks serialize the delete with concurrent
// assignments (FK inserts take KEY SHARE locks) and with a second delete
describe("PrismaUserRepository.lockForDeletion", () => {
  it("locks the user and teacher rows, then reads the user", async () => {
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
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    const sql = (tx.$queryRaw.mock.calls as [TemplateStringsArray][])
      .map(([strings]) => strings.join("?"))
      .join(" ");
    expect(sql).toMatch(/FROM "users".*FOR UPDATE/);
    expect(sql).toMatch(/FROM "teachers".*FOR UPDATE/);
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
