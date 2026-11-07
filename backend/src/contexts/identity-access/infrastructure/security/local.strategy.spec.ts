import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { LocalStrategy } from "./local.strategy";
import { AuthService } from "../../application/auth.service";

// THESIS: T116 (M9) – LocalAuthGuard with passport-local guards POST /auth/login
describe("LocalStrategy", () => {
  const validateCredentials = jest.fn();
  const strategy = new LocalStrategy({
    validateCredentials,
  } as unknown as AuthService);

  beforeEach(() => jest.clearAllMocks());

  it("hands the identifier (username or e-mail) and password to AuthService", async () => {
    validateCredentials.mockResolvedValue({ user_id: 7 });

    await expect(strategy.validate("m@htl.at", "geheim123")).resolves.toEqual({
      user_id: 7,
    });
    expect(validateCredentials).toHaveBeenCalledWith("m@htl.at", "geheim123");
  });

  it("passes on the 401 for wrong credentials", async () => {
    validateCredentials.mockRejectedValue(new UnauthorizedException());

    await expect(strategy.validate("maxm", "falsch")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // M9 review: the guard runs before the ValidationPipe, so the strategy checks the types
  it.each([
    [12345, "geheim123"],
    ["ffuchs", true],
    ["x".repeat(255), "geheim123"],
  ])(
    "rejects %p / %p with 400 before any lookup",
    async (identifier, password) => {
      await expect(
        strategy.validate(identifier as string, password as string),
      ).rejects.toThrow(BadRequestException);
      expect(validateCredentials).not.toHaveBeenCalled();
    },
  );
});
