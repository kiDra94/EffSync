import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { PasswordChangeGuard } from "./password-change.guard";
import { PasswordResetService } from "../../application/password-reset.service";

// M13: set-new-password accepts a reset token (the e-mail link or the Google
// reset path); review M27: an access token no longer passes
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

  it("rejects a token that is no reset token, such as an access token", async () => {
    const resets = { userIdForResetToken: jest.fn().mockResolvedValue(null) };
    const guard = new PasswordChangeGuard(
      resets as unknown as PasswordResetService,
    );

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: "Bearer access.jwt" } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a request without a token", async () => {
    const resets = { userIdForResetToken: jest.fn() };
    const guard = new PasswordChangeGuard(
      resets as unknown as PasswordResetService,
    );

    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
    expect(resets.userIdForResetToken).not.toHaveBeenCalled();
  });
});
