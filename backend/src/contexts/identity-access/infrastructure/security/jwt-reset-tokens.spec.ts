import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtResetTokens, RESET_TOKEN_TTL } from "./jwt-reset-tokens";

// decision Q8a (M13): purpose "reset", 30 minutes, key = JWT_SECRET + password hash
describe("JwtResetTokens", () => {
  const jwt = new JwtService({ secret: "app-secret" });
  const config = { getOrThrow: () => "app-secret" } as unknown as ConfigService;
  const tokens = new JwtResetTokens(jwt, config);

  it("signs a 30-minute reset token that verifies with the same password hash", () => {
    const token = tokens.sign(9, "hash-1");
    const claims = jwt.decode<{
      sub: number;
      purpose: string;
      iat: number;
      exp: number;
    }>(token);

    expect(RESET_TOKEN_TTL).toBe("30m");
    expect(claims).toMatchObject({ sub: 9, purpose: "reset" });
    expect(claims.exp - claims.iat).toBe(30 * 60);
    expect(tokens.subjectOf(token)).toBe(9);
    expect(tokens.verify(token, "hash-1")).toBe(true);
  });

  it("stops verifying once the password hash has changed", () => {
    expect(tokens.verify(tokens.sign(9, "hash-1"), "hash-2")).toBe(false);
  });

  it("is not an access token, and an access token is no reset token", () => {
    const reset = tokens.sign(9, "hash-1");
    expect(() => {
      jwt.verify(reset);
    }).toThrow();

    const access = jwt.sign({ sub: 9, username: "teder" });
    expect(tokens.subjectOf(access)).toBeNull();
    expect(tokens.subjectOf("not a jwt")).toBeNull();
  });

  it("rejects an expired or forged reset token", () => {
    const expired = jwt.sign(
      { sub: 9, purpose: "reset" },
      { secret: "app-secret:reset:hash-1", expiresIn: -60 },
    );
    const forged = jwt.sign(
      { sub: 9, purpose: "reset" },
      { secret: "guessedhash-1" },
    );

    expect(tokens.verify(expired, "hash-1")).toBe(false);
    expect(tokens.verify(forged, "hash-1")).toBe(false);
  });

  it("rejects a token signed with the password key but without the reset purpose", () => {
    const other = jwt.sign({ sub: 9 }, { secret: "app-secret:reset:hash-1" });

    expect(tokens.verify(other, "hash-1")).toBe(false);
  });

  // review M13 (1): a Google-only account has no password hash; its key must
  // still differ from JWT_SECRET, or the reset token would pass as access token
  it("never signs with the plain JWT_SECRET, even without a password hash", () => {
    const reset = tokens.sign(9, "");

    expect(() => {
      jwt.verify(reset);
    }).toThrow();
    expect(tokens.verify(reset, "")).toBe(true);
  });
});
