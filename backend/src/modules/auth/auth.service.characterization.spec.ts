/**
 * Characterization tests for AuthService (GOALS.md M2): hashing cost and the
 * login lookup, both of which differ from the thesis.
 */
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";

function createPrismaMock() {
  return {
    users: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    roles: { findFirst: jest.fn() },
    user_roles: { create: jest.fn() },
  };
}

describe("AuthService (characterization, M2)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let jwt: { sign: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrismaMock();
    jwt = { sign: jest.fn().mockReturnValue("signed-token") };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  const hashCost = (hash: unknown) => Number(String(hash).split("$")[2]);

  // THESIS: T50 – registration hashes with cost 10, the thesis requires 12
  it("hashes the password with bcrypt cost 10 on registration", async () => {
    prisma.users.create.mockResolvedValue({ user_id: 7 });
    prisma.roles.findFirst.mockResolvedValue({ role_id: 2 });

    await service.register({
      username: "maxm",
      email: "m@htl.at",
      password: "geheim123",
    } as never);

    const data = (
      prisma.users.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(hashCost(data.password_hash)).toBe(10);
    expect(data).not.toHaveProperty("password");
  });

  // THESIS: T50
  it("hashes a new password with bcrypt cost 10", async () => {
    await service.setNewPassword(7, "neuesPasswort1");

    const data = (
      prisma.users.update.mock.calls[0][0] as {
        data: { password_hash: string };
      }
    ).data;
    expect(hashCost(data.password_hash)).toBe(10);
  });

  it("assigns the Student role found by name on registration", async () => {
    prisma.users.create.mockResolvedValue({ user_id: 7 });
    prisma.roles.findFirst.mockResolvedValue({ role_id: 3 });

    await service.register({
      username: "maxm",
      email: "m@htl.at",
      password: "geheim123",
    } as never);

    expect(prisma.roles.findFirst).toHaveBeenCalledWith({
      where: { name: { in: ["Student", "student"] } },
    });
    expect(prisma.user_roles.create).toHaveBeenCalledWith({
      data: { user_id: 7, role_id: 3 },
    });
  });

  it("falls back to role id 2 when no Student role exists", async () => {
    prisma.users.create.mockResolvedValue({ user_id: 7 });
    prisma.roles.findFirst.mockResolvedValue(null);

    await service.register({
      username: "maxm",
      email: "m@htl.at",
      password: "geheim123",
    } as never);

    expect(prisma.user_roles.create).toHaveBeenCalledWith({
      data: { user_id: 7, role_id: 2 },
    });
  });

  // THESIS: T49 – login looks up the username only; an e-mail address is not accepted
  it("looks the login name up as a username only, so an e-mail address fails with 401", async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ username: "m@htl.at", password: "geheim123" }),
    ).rejects.toThrow("Username existiert nicht");
    expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.users.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: "m@htl.at" } }),
    );
  });

  it("returns the user without the hash, the lower-cased primary role and a signed token", async () => {
    const passwordHash = await bcrypt.hash("geheim123", 4);
    prisma.users.findUnique.mockResolvedValue({
      user_id: 7,
      username: "maxm",
      password_hash: passwordHash,
      user_roles: [
        { roles: { name: "Teacher" } },
        { roles: { name: "Admin" } },
      ],
    });

    const result = await service.login({
      username: "maxm",
      password: "geheim123",
    });

    expect(result).not.toHaveProperty("password_hash");
    expect(result.role).toBe("teacher");
    expect(result.token).toBe("signed-token");
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 7,
      username: "maxm",
      role: "teacher",
    });
  });

  it("uses the role 'user' when the account has no role", async () => {
    prisma.users.findUnique.mockResolvedValue({
      user_id: 7,
      username: "maxm",
      password_hash: await bcrypt.hash("geheim123", 4),
      user_roles: [],
    });

    const result = await service.login({
      username: "maxm",
      password: "geheim123",
    });

    expect(result.role).toBe("user");
  });

  it("rejects a wrong password with 401", async () => {
    prisma.users.findUnique.mockResolvedValue({
      user_id: 7,
      username: "maxm",
      password_hash: await bcrypt.hash("geheim123", 4),
      user_roles: [],
    });

    await expect(
      service.login({ username: "maxm", password: "falsch123" }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
