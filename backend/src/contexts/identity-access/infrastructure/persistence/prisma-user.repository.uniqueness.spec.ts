import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUserRepository } from "./prisma-user.repository";

// M29 (review): a taken username or e-mail is a 409 everywhere
describe("PrismaUserRepository uniqueness", () => {
  const prisma = {
    users: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const repository = new PrismaUserRepository(
    prisma as unknown as PrismaService,
  );
  const unique = new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "7",
  });

  it("finds a taken username or e-mail in one query, the e-mail case-insensitively", async () => {
    prisma.users.findFirst.mockResolvedValueOnce({ user_id: 4 });

    await expect(repository.isTaken("ffuchs", "FFuchs@htl.at")).resolves.toBe(
      true,
    );
    expect(prisma.users.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { username: "ffuchs" },
          { email: { equals: "FFuchs@htl.at", mode: "insensitive" } },
        ],
      },
      select: { user_id: true },
    });
  });

  it("turns the unique index into a 409 on create and update (a race, PATCH)", async () => {
    prisma.users.create.mockRejectedValueOnce(unique);
    prisma.users.update.mockRejectedValueOnce(unique);

    await expect(repository.create({} as never)).rejects.toThrow(
      ConflictException,
    );
    await expect(repository.update(4, { username: "x" })).rejects.toThrow(
      ConflictException,
    );
  });

  it("passes other errors on", async () => {
    prisma.users.create.mockRejectedValueOnce(new Error("db down"));

    await expect(repository.create({} as never)).rejects.toThrow("db down");
  });
});
