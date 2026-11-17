import { PrismaUserRepository } from "./prisma-user.repository";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";

// review M13 (3): the password update joins an open unit of work, so the
// password change and the session revoke commit together
describe("PrismaUserRepository.updatePasswordHash", () => {
  it("writes through the unit of work's client", async () => {
    const tx = {
      users: { update: jest.fn().mockResolvedValue({ user_id: 9 }) },
    };
    const prisma = { users: { update: jest.fn() } };
    const unitOfWork = { client: () => tx };
    const repository = new PrismaUserRepository(
      prisma as unknown as PrismaService,
      unitOfWork as unknown as PrismaUnitOfWork,
    );

    await repository.updatePasswordHash(9, "hash");

    expect(tx.users.update).toHaveBeenCalledWith({
      where: { user_id: 9 },
      data: { password_hash: "hash" },
    });
    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});
