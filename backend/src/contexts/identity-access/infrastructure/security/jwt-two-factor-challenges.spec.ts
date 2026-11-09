import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtTwoFactorChallenges } from "./jwt-two-factor-challenges";

// UC-01b (M32): the challenge between password and code
describe("JwtTwoFactorChallenges", () => {
  const config = {
    getOrThrow: () => "a-test-secret-of-at-least-32-characters",
  } as unknown as ConfigService;
  const jwt = new JwtService({});
  const challenges = new JwtTwoFactorChallenges(jwt, config);

  it("signs a challenge for the user and reads it back", () => {
    expect(challenges.verify(challenges.sign(4))).toBe(4);
  });

  it("is never an access token: the app's key doesn't verify it", () => {
    const token = challenges.sign(4);

    expect(() => {
      jwt.verify<object>(token, {
        secret: "a-test-secret-of-at-least-32-characters",
      });
    }).toThrow();
  });

  it("refuses an access token, a forged and an expired challenge", () => {
    const access = jwt.sign(
      { sub: 4, username: "ffuchs" },
      { secret: "a-test-secret-of-at-least-32-characters" },
    );
    expect(challenges.verify(access)).toBeNull();
    expect(challenges.verify("not.a.token")).toBeNull();

    jest.useFakeTimers({ now: Date.now() });
    const token = challenges.sign(4);
    jest.setSystemTime(Date.now() + 6 * 60 * 1000);
    expect(challenges.verify(token)).toBeNull();
    jest.useRealTimers();
  });
});
