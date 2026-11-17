import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { RefreshTokenRepository } from "./ports/refresh-token.repository";
import type { UserRepository } from "./ports/user.repository";
import type { SecretCipher } from "./ports/secret-cipher";
import type { Totp } from "./ports/totp";
import type { TwoFactorChallenges } from "./ports/two-factor-challenges";
import type { TwoFactorRepository } from "./ports/two-factor.repository";
import { TwoFactorService } from "./two-factor.service";

// T31, UC-01b, decision Q8d (M32): TOTP as the second factor of the login
describe("TwoFactorService", () => {
  const STEP = 1_000_000;
  let rows: Map<number, { secret_encrypted: string; enabled_at: Date | null }>;
  let repository: Record<string, jest.Mock>;
  let totp: {
    generateSecret: jest.Mock;
    provisioning: jest.Mock;
    matchStep: jest.Mock;
  };
  let cipher: { encrypt: jest.Mock; decrypt: jest.Mock };
  let challenges: { sign: jest.Mock; verify: jest.Mock };
  let users: { findById: jest.Mock };
  let refreshTokens: { revokeAllForUser: jest.Mock };
  let service: TwoFactorService;

  beforeEach(() => {
    rows = new Map();
    repository = {
      find: jest.fn((userId: number) =>
        Promise.resolve(
          rows.has(userId) ? { user_id: userId, ...rows.get(userId)! } : null,
        ),
      ),
      savePending: jest.fn((userId: number, secret: string) => {
        rows.set(userId, { secret_encrypted: secret, enabled_at: null });
        return Promise.resolve();
      }),
      markEnabled: jest.fn((userId: number, at: Date) => {
        rows.get(userId)!.enabled_at = at;
        return Promise.resolve();
      }),
      delete: jest.fn((userId: number) => Promise.resolve(rows.delete(userId))),
    };
    totp = {
      generateSecret: jest.fn(() => "BASE32SECRET"),
      provisioning: jest.fn(() =>
        Promise.resolve({
          otpauthUrl: "otpauth://totp/x",
          qrCode: "data:image/png;base64,QR",
        }),
      ),
      // "123456" belongs to STEP, "654321" to the next step, all else is wrong
      matchStep: jest.fn((code: string) =>
        code === "123456" ? STEP : code === "654321" ? STEP + 1 : null,
      ),
    };
    cipher = {
      encrypt: jest.fn((plain: string) => `enc(${plain})`),
      decrypt: jest.fn((stored: string) => stored.slice(4, -1)),
    };
    challenges = {
      sign: jest.fn((userId: number) => `challenge-${userId}`),
      verify: jest.fn((token: string) =>
        token.startsWith("challenge-") ? Number(token.slice(10)) : null,
      ),
    };
    users = {
      findById: jest.fn((userId: number) =>
        Promise.resolve(userId === 99 ? null : { user_id: userId }),
      ),
    };
    refreshTokens = { revokeAllForUser: jest.fn() };
    service = new TwoFactorService(
      repository as unknown as TwoFactorRepository,
      totp as unknown as Totp,
      cipher as unknown as SecretCipher,
      challenges as unknown as TwoFactorChallenges,
      users as unknown as UserRepository,
      refreshTokens as unknown as RefreshTokenRepository,
    );
  });

  const enabled = async (userId = 4) => {
    await service.setup(userId, "ffuchs");
    await service.enable(userId, "123456");
  };

  it("sets up a pending secret, stored encrypted, with its QR code", async () => {
    await expect(service.setup(4, "ffuchs")).resolves.toEqual({
      secret: "BASE32SECRET",
      otpauth_url: "otpauth://totp/x",
      qr_code: "data:image/png;base64,QR",
    });
    expect(repository.savePending).toHaveBeenCalledWith(4, "enc(BASE32SECRET)");
    expect(totp.provisioning).toHaveBeenCalledWith("BASE32SECRET", "ffuchs");
    await expect(service.status(4)).resolves.toEqual({ enabled: false });
  });

  it("enables it with a valid code, and refuses a wrong one with 400", async () => {
    await service.setup(4, "ffuchs");
    await expect(service.enable(4, "000000")).rejects.toThrow(
      BadRequestException,
    );
    await service.enable(4, "123456");

    expect(cipher.decrypt).toHaveBeenCalledWith("enc(BASE32SECRET)");
    await expect(service.status(4)).resolves.toEqual({ enabled: true });
  });

  it("refuses enabling without a setup and setting up twice (409)", async () => {
    await expect(service.enable(4, "123456")).rejects.toThrow(
      BadRequestException,
    );
    await enabled();
    await expect(service.setup(4, "ffuchs")).rejects.toThrow(ConflictException);
  });

  it("asks a user with 2FA for a code at login, and others not", async () => {
    await expect(service.isEnabled(4)).resolves.toBe(false);
    await enabled();
    await expect(service.isEnabled(4)).resolves.toBe(true);
    expect(service.challenge(4)).toBe("challenge-4");
  });

  it("lets the login through with a valid code (UC-01b step 5)", async () => {
    await enabled();

    await expect(service.verifyLogin("challenge-4", "654321")).resolves.toBe(4);
  });

  it("answers 401 for a wrong code, a bad challenge or a user without 2FA", async () => {
    await enabled();

    await expect(service.verifyLogin("challenge-4", "000000")).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.verifyLogin("forged", "654321")).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.verifyLogin("challenge-5", "654321")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // a code seen once can't open a second login in its time step
  it("refuses a code that was already used", async () => {
    await enabled(); // used the code of STEP

    await expect(service.verifyLogin("challenge-4", "123456")).rejects.toThrow(
      UnauthorizedException,
    );
    await service.verifyLogin("challenge-4", "654321");
    await expect(service.verifyLogin("challenge-4", "654321")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("disables it with a valid code only", async () => {
    await enabled();

    await expect(service.disable(4, "000000")).rejects.toThrow(
      BadRequestException,
    );
    await service.disable(4, "654321");
    await expect(service.status(4)).resolves.toEqual({ enabled: false });
  });

  it("lets an admin reset it by deleting the row (decision Q8d)", async () => {
    await enabled();

    await service.reset(4);

    expect(repository.delete).toHaveBeenCalledWith(4);
    await expect(service.isEnabled(4)).resolves.toBe(false);
  });

  // review M32
  it("answers 404 when the admin resets a missing user or the ghost user", async () => {
    await expect(service.reset(99)).rejects.toThrow(NotFoundException);
    await expect(service.reset(0)).rejects.toThrow(NotFoundException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("ends the user's other sessions when 2FA goes on", async () => {
    await enabled();

    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(4);
  });

  it("opens a challenge only once", async () => {
    await enabled();
    await service.verifyLogin("challenge-4", "654321");
    totp.matchStep.mockReturnValue(STEP + 2);

    await expect(service.verifyLogin("challenge-4", "111111")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("locks the code check for a while after 5 wrong codes, also the right one", async () => {
    jest.useFakeTimers({ now: new Date("2026-11-09T12:00:00Z") });
    try {
      await enabled();
      for (let attempt = 0; attempt < 5; attempt++) {
        await expect(
          service.verifyLogin("challenge-4", "000000"),
        ).rejects.toThrow(UnauthorizedException);
      }

      const locked = service.verifyLogin("challenge-4", "654321");
      await expect(locked).rejects.toThrow(HttpException);
      await expect(locked).rejects.toMatchObject({ status: 429 });
      await expect(service.disable(4, "654321")).rejects.toMatchObject({
        status: 429,
      });

      jest.setSystemTime(new Date("2026-11-09T12:16:00Z"));
      await expect(service.verifyLogin("challenge-4", "654321")).resolves.toBe(
        4,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("forgets the used step when 2FA is set up again", async () => {
    await enabled(); // STEP
    await service.disable(4, "654321"); // STEP + 1
    await service.setup(4, "ffuchs");

    // the same step's code of the new secret works
    await expect(service.enable(4, "654321")).resolves.toBeUndefined();
  });
});
