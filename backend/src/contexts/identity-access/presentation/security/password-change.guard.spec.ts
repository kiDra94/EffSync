import { ExecutionContext } from "@nestjs/common";
import { PasswordChangeGuard } from "./password-change.guard";
import { PasswordResetService } from "../../application/password-reset.service";

// M13: set-new-password accepts a reset token from the e-mail link, or an
// access token (the Google reset path keeps working)
describe("PasswordChangeGuard", () => {
  const contextFor = (request: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it("lets a valid reset token through and sets the user", async () => {
    const resets = { userIdForResetToken: jest.fn().mockResolvedValue(9) };
    const guard = new PasswordChangeGuard(
      resets as unknown as PasswordResetService,
    );
    const request: { headers: object; user?: unknown } = {
      headers: { authorization: "Bearer reset.jwt" },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(resets.userIdForResetToken).toHaveBeenCalledWith("reset.jwt");
    expect(request.user).toEqual({ userId: 9 });
  });

  it("passes a token that is no reset token on to the JWT check", async () => {
    const resets = { userIdForResetToken: jest.fn().mockResolvedValue(null) };
    const guard = new PasswordChangeGuard(
      resets as unknown as PasswordResetService,
    );
    const jwtCheck = jest
      .spyOn(
        Object.getPrototypeOf(PasswordChangeGuard.prototype),
        "canActivate",
      )
      .mockResolvedValue(true);

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: "Bearer access.jwt" } }),
      ),
    ).resolves.toBe(true);
    expect(jwtCheck).toHaveBeenCalledTimes(1);
    jwtCheck.mockRestore();
  });
});
