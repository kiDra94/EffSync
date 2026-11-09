import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUserRepository } from "./prisma-user.repository";

// review M37: login and JwtStrategy take the same "first role", the lowest
// role id (the include had no order, so it was any row)
describe("PrismaUserRepository roles order", () => {
  const prisma = {
    users: { findFirst: jest.fn(), findUnique: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const repository = new PrismaUserRepository(
    prisma as unknown as PrismaService,
  );
  const ordered: unknown = expect.objectContaining({
    include: {
      user_roles: { include: { roles: true }, orderBy: { role_id: "asc" } },
    },
  });

  it("reads the roles of a login by role id", async () => {
    await repository.findByUsernameWithRoles("ffuchs");
    await repository.findByEmailWithRoles("felix@htl.at");
    await repository.findByIdWithRoles(4);

    expect(prisma.users.findFirst).toHaveBeenNthCalledWith(1, ordered);
    expect(prisma.users.findFirst).toHaveBeenNthCalledWith(2, ordered);
    expect(prisma.users.findUnique).toHaveBeenCalledWith(ordered);
  });

  it("reads the session user's first role by role id", async () => {
    await repository.findSessionUser(4);

    const [query] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(query.join("?")).toMatch(/ORDER BY ur\.role_id LIMIT 1/);
  });
});
