/**
 * Characterization tests for AuthService (GOALS.md M2): hashing cost and the
 * login lookup, flipped to the thesis in M9 (T49, T50).
 */
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";

function createPrismaMock() {
  return {
    users: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
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

  // POST /auth/login = LocalStrategy (validateCredentials) + issueToken
  const login = async (dto: { identifier: string; password: string }) =>
    service.issueToken(
      await service.validateCredentials(dto.identifier, dto.password),
    );

  const hashCost = (hash: unknown) => Number(String(hash).split("$")[2]);

  // THESIS: T50 (flipped in M9) – bcrypt cost factor 12
  it("hashes the password with bcrypt cost 12 on registration", async () => {
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
    expect(hashCost(data.password_hash)).toBe(12);
    expect(data).not.toHaveProperty("password");
  });

  // THESIS: T50 (flipped in M9)
  it("hashes a new password with bcrypt cost 12", async () => {
    await service.setNewPassword(7, "neuesPasswort1");

    const data = (
      prisma.users.update.mock.calls[0][0] as {
        data: { password_hash: string };
      }
    ).data;
    expect(hashCost(data.password_hash)).toBe(12);
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
      // DECISION: Q10 (M7) – looked up by RoleName only, no lower-case variant
      where: { name: "Student" },
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

  // THESIS: T49 (flipped in M9) – login accepts the username or the e-mail address
  it("looks the identifier up as username or e-mail address", async () => {
    prisma.users.findFirst.mockResolvedValue({
      user_id: 7,
      username: "maxm",
      password_hash: await bcrypt.hash("geheim123", 4),
      user_roles: [],
    });

    const result = await login({
      identifier: "m@htl.at",
      password: "geheim123",
    });

    expect(result.token).toBe("signed-token");
    // username first (exact), then the e-mail address case-insensitively (M9 review)
    expect(prisma.users.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { username: "m@htl.at" } }),
    );
  });

  it("falls back to the e-mail address, ignoring its case", async () => {
    prisma.users.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      user_id: 7,
      username: "maxm",
      password_hash: await bcrypt.hash("geheim123", 4),
      user_roles: [],
    });

    const result = await login({
      identifier: "Max@HTL.at",
      password: "geheim123",
    });

    expect(result.username).toBe("maxm");
    expect(prisma.users.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { email: { equals: "Max@HTL.at", mode: "insensitive" } },
      }),
    );
  });

  // M9 review: unknown account and wrong password look the same (no account enumeration)
  it("answers an unknown account and a wrong password with the same message", async () => {
    prisma.users.findFirst.mockResolvedValue(null);
    const unknown = login({ identifier: "nobody@htl.at", password: "x" });
    await expect(unknown).rejects.toThrow("Ungültige Zugangsdaten");
  });

  it("rejects an unknown identifier with 401", async () => {
    prisma.users.findFirst.mockResolvedValue(null);

    await expect(
      login({ identifier: "nobody", password: "geheim123" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("returns the user without the hash, the lower-cased primary role and a signed token", async () => {
    const passwordHash = await bcrypt.hash("geheim123", 4);
    prisma.users.findFirst.mockResolvedValue({
      user_id: 7,
      username: "maxm",
      password_hash: passwordHash,
      user_roles: [
        { roles: { name: "Teacher" } },
        { roles: { name: "Admin" } },
      ],
    });

    const result = await login({
      identifier: "maxm",
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
    prisma.users.findFirst.mockResolvedValue({
      user_id: 7,
      username: "maxm",
      password_hash: await bcrypt.hash("geheim123", 4),
      user_roles: [],
    });

    const result = await login({
      identifier: "maxm",
      password: "geheim123",
    });

    expect(result.role).toBe("user");
  });

  it("rejects a wrong password with 401", async () => {
    prisma.users.findFirst.mockResolvedValue({
      user_id: 7,
      username: "maxm",
      password_hash: await bcrypt.hash("geheim123", 4),
      user_roles: [],
    });

    await expect(
      login({ identifier: "maxm", password: "falsch123" }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
