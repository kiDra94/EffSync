import { UnauthorizedException } from "@nestjs/common";
import { PasswordResetService } from "./password-reset.service";
import { UserRepository } from "./ports/user.repository";
import { ResetTokens } from "./ports/reset-tokens";
import { PasswordResetMailer } from "./ports/password-reset-mailer";
import { RefreshTokenRepository } from "./ports/refresh-token.repository";
import { AuthService } from "./auth.service";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import type { Transaction } from "../../../shared/domain/transaction";

// T52, decision Q8a (M13): reset by e-mail with a token whose key contains the
// current password hash; a password change ends all sessions (found in M12)
describe("PasswordResetService", () => {
  const user = {
    user_id: 9,
    email: "tobias@student.htl.at",
    password_hash: "$2b$12$current",
  };

  let users: { findByEmailWithRoles: jest.Mock; findById: jest.Mock };
  let tokens: Record<keyof ResetTokens, jest.Mock>;
  let mailer: { sendResetLink: jest.Mock };
  let refreshTokens: { revokeAllForUser: jest.Mock };
  let auth: { setNewPassword: jest.Mock };
  let unitOfWork: { run: jest.Mock };
  let service: PasswordResetService;

  beforeEach(() => {
    users = { findByEmailWithRoles: jest.fn(), findById: jest.fn() };
    tokens = {
      sign: jest.fn().mockReturnValue("reset.jwt"),
      subjectOf: jest.fn(),
      verify: jest.fn(),
    };
    mailer = { sendResetLink: jest.fn().mockResolvedValue(undefined) };
    refreshTokens = { revokeAllForUser: jest.fn().mockResolvedValue(2) };
    auth = { setNewPassword: jest.fn().mockResolvedValue(undefined) };
    unitOfWork = {
      run: jest.fn((work: (tx: Transaction) => Promise<unknown>) =>
        work({} as Transaction),
      ),
    };
    service = new PasswordResetService(
      users as unknown as UserRepository,
      tokens as unknown as ResetTokens,
      mailer as unknown as PasswordResetMailer,
      refreshTokens as unknown as RefreshTokenRepository,
      auth as unknown as AuthService,
      unitOfWork as unknown as UnitOfWork,
    );
  });

  describe("requestReset", () => {
    it("mails a token signed with the user's current password hash", async () => {
      users.findByEmailWithRoles.mockResolvedValue(user);

      await service.requestReset("Tobias@Student.HTL.at");
      await new Promise(setImmediate);

      expect(users.findByEmailWithRoles).toHaveBeenCalledWith(
        "Tobias@Student.HTL.at",
      );
      expect(tokens.sign).toHaveBeenCalledWith(9, "$2b$12$current");
      expect(mailer.sendResetLink).toHaveBeenCalledWith(
        { user_id: 9, email: "tobias@student.htl.at" },
        "reset.jwt",
      );
    });

    it("does nothing for an unknown address and never reveals it", async () => {
      users.findByEmailWithRoles.mockResolvedValue(null);

      await expect(service.requestReset("x@y.at")).resolves.toBeUndefined();
      expect(mailer.sendResetLink).not.toHaveBeenCalled();
    });

    it("doesn't wait for the mail, and a failing mail doesn't fail the request", async () => {
      users.findByEmailWithRoles.mockResolvedValue(user);
      mailer.sendResetLink.mockRejectedValue(new Error("SMTP down"));

      await expect(service.requestReset(user.email)).resolves.toBeUndefined();
      await new Promise(setImmediate);
    });
  });

  describe("userIdForResetToken", () => {
    it("returns null for a token that is no reset token (an access token)", async () => {
      tokens.subjectOf.mockReturnValue(null);

      await expect(service.userIdForResetToken("access.jwt")).resolves.toBe(
        null,
      );
    });

    it("returns the user of a valid reset token", async () => {
      tokens.subjectOf.mockReturnValue(9);
      users.findById.mockResolvedValue(user);
      tokens.verify.mockReturnValue(true);

      await expect(service.userIdForResetToken("reset.jwt")).resolves.toBe(9);
      expect(tokens.verify).toHaveBeenCalledWith("reset.jwt", "$2b$12$current");
    });

    it("rejects a used, expired or forged reset token, or one of a deleted user, with 401", async () => {
      tokens.subjectOf.mockReturnValue(9);
      users.findById.mockResolvedValue(user);
      tokens.verify.mockReturnValue(false);
      await expect(service.userIdForResetToken("old.jwt")).rejects.toThrow(
        UnauthorizedException,
      );

      users.findById.mockResolvedValue(null);
      await expect(service.userIdForResetToken("old.jwt")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // review M13 (3): both writes in one unit of work, so a failed revoke
  // doesn't leave a changed password with live sessions
  it("changes the password and ends all of the user's sessions in one unit of work", async () => {
    unitOfWork.run.mockImplementation(
      async (work: (tx: Transaction) => Promise<unknown>) => {
        expect(auth.setNewPassword).not.toHaveBeenCalled();
        await work({} as Transaction);
        expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(9);
      },
    );

    await service.changePassword(9, "neues-passwort");

    expect(unitOfWork.run).toHaveBeenCalledTimes(1);
    expect(auth.setNewPassword).toHaveBeenCalledWith(9, "neues-passwort");
  });
});
