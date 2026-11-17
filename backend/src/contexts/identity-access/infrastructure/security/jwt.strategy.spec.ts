import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { UserRepository } from "../../application/ports/user.repository";
import { JwtStrategy } from "./jwt.strategy";

// M37: every request reads the user in one query (it took three)
describe("JwtStrategy.validate", () => {
  const users = { findSessionUser: jest.fn() };
  const config = {
    getOrThrow: jest.fn(() => "a-test-secret-of-at-least-32-characters"),
  };
  const strategy = new JwtStrategy(
    users as unknown as UserRepository,
    config as unknown as ConfigService,
  );
  const anna = {
    email: "anna@htl.at",
    firstname: "Anna",
    lastname: "Lehrer",
    role: "Teacher",
  };

  beforeEach(() => jest.clearAllMocks());

  it("puts the user on the request, with the token's role first", async () => {
    users.findSessionUser.mockResolvedValue(anna);

    await expect(
      strategy.validate({ sub: 2, username: "alehrerin", role: "teacher" }),
    ).resolves.toEqual({
      id: 2,
      userId: 2,
      username: "alehrerin",
      email: "anna@htl.at",
      firstname: "Anna",
      lastname: "Lehrer",
      role: "teacher",
    });
    expect(users.findSessionUser).toHaveBeenCalledWith(2);
  });

  it("falls back to the first role in the database, else 'user'", async () => {
    users.findSessionUser.mockResolvedValue(anna);
    await expect(
      strategy.validate({ sub: 2, username: "alehrerin" }),
    ).resolves.toMatchObject({ role: "teacher" });

    users.findSessionUser.mockResolvedValue({ ...anna, role: null });
    await expect(
      strategy.validate({ sub: 2, username: "alehrerin" }),
    ).resolves.toMatchObject({ role: "user" });
  });

  it("refuses a token of a user that no longer exists", async () => {
    users.findSessionUser.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 99, username: "weg" }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
