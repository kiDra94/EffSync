import type { Profile } from "passport-google-oauth20";
import { GoogleStrategy } from "./google.strategy";
import { AuthService } from "../../application/auth.service";

// M13 step 5: the strategy only maps the profile; AuthService owns the rules
describe("GoogleStrategy", () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID ??= "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET ??= "test-client-secret";
  });

  it("hands the mapped profile to AuthService.signInWithGoogle", async () => {
    const signedIn = { userId: 4, username: "anna", role: "teacher" };
    const auth = { signInWithGoogle: jest.fn().mockResolvedValue(signedIn) };
    const strategy = new GoogleStrategy(auth as unknown as AuthService);
    const done = jest.fn();

    await strategy.validate(
      "at",
      "rt",
      {
        id: "g-1",
        emails: [{ value: "anna@htl.at", verified: true }],
        name: { givenName: "Anna", familyName: "Lehrerin" },
      } as Profile,
      done,
    );

    expect(auth.signInWithGoogle).toHaveBeenCalledWith({
      googleId: "g-1",
      email: "anna@htl.at",
      emailVerified: true,
      firstname: "Anna",
      lastname: "Lehrerin",
    });
    expect(done).toHaveBeenCalledWith(null, signedIn);
  });

  it("reports a failed sign-in to passport", async () => {
    const error = new Error("db down");
    const auth = { signInWithGoogle: jest.fn().mockRejectedValue(error) };
    const done = jest.fn();

    await new GoogleStrategy(auth as unknown as AuthService).validate(
      "at",
      "rt",
      { id: "g-1" } as Profile,
      done,
    );

    expect(done).toHaveBeenCalledWith(error, false);
  });
});
