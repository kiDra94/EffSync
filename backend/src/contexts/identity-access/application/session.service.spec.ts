import { UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { SessionService, REFRESH_TOKEN_TTL_MS } from "./session.service";
import { RefreshTokenRepository } from "./ports/refresh-token.repository";
import { AuthService } from "./auth.service";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import type { Transaction } from "../../../shared/domain/transaction";

// T51, decision Q8b (M12): refresh tokens are stored hashed, rotate on refresh,
// and logout revokes only the current session
describe("SessionService", () => {
  const user = {
    user_id: 7,
    username: "ffuchs",
    user_roles: [{ roles: { name: "Student" } }],
  };
  const sha256 = (value: string) =>
    createHash("sha256").update(value).digest("hex");

  let repository: Record<keyof RefreshTokenRepository, jest.Mock>;
  let auth: { issueToken: jest.Mock };
  let unitOfWork: { run: jest.Mock };
  let sessions: SessionService;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findActiveByHash: jest.fn(),
      revokeIfActive: jest.fn().mockResolvedValue(true),
      revokeActiveByHash: jest.fn().mockResolvedValue(undefined),
      deleteExpired: jest.fn().mockResolvedValue(4),
    };
    auth = { issueToken: jest.fn().mockReturnValue({ token: "access.jwt" }) };
    unitOfWork = {
      run: jest.fn((work: (tx: Transaction) => Promise<unknown>) =>
        work({} as Transaction),
      ),
    };
    sessions = new SessionService(
      repository as unknown as RefreshTokenRepository,
      auth as unknown as AuthService,
      unitOfWork as unknown as UnitOfWork,
    );
  });

  it("starts a session with a random refresh token and stores only its hash, valid 7 days", async () => {
    const before = Date.now();
    const refreshToken = await sessions.start(7);

    expect(refreshToken).toMatch(/^[\w-]{43}$/);
    const [[row]] = repository.create.mock.calls as [
      [
        {
          user_id: number;
          token_hash: string;
          expires_at: Date;
        },
      ],
    ];
    expect(row.user_id).toBe(7);
    expect(row.token_hash).toBe(sha256(refreshToken));
    expect(row.token_hash).not.toContain(refreshToken);
    expect(row.expires_at.getTime()).toBeGreaterThanOrEqual(
      before + REFRESH_TOKEN_TTL_MS,
    );
  });

  it("rotates on refresh: revokes the old row and issues a new access and refresh token in one unit of work", async () => {
    const loginExpiry = new Date("2026-11-14T08:00:00Z");
    repository.findActiveByHash.mockResolvedValue({
      id: 3,
      user_id: 7,
      expires_at: loginExpiry,
      users: user,
    });

    const result = await sessions.refresh("old-refresh-token");

    expect(repository.findActiveByHash).toHaveBeenCalledWith(
      sha256("old-refresh-token"),
    );
    expect(repository.revokeIfActive).toHaveBeenCalledWith(3);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(unitOfWork.run).toHaveBeenCalledTimes(1);
    expect(auth.issueToken).toHaveBeenCalledWith(user);
    expect(result.token).toBe("access.jwt");
    expect(result.refreshToken).not.toBe("old-refresh-token");
    // T51: the session ends 7 days after the login, rotation doesn't extend it
    const [[row]] = repository.create.mock.calls as [
      [{ user_id: number; expires_at: Date }],
    ];
    expect(row).toMatchObject({ user_id: 7, expires_at: loginExpiry });
  });

  it("rejects an unknown, revoked or expired refresh token with 401", async () => {
    repository.findActiveByHash.mockResolvedValue(null);

    await expect(sessions.refresh("unknown")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a token that a parallel refresh already rotated", async () => {
    repository.findActiveByHash.mockResolvedValue({ id: 3, users: user });
    repository.revokeIfActive.mockResolvedValue(false);

    await expect(sessions.refresh("raced")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("revokes the session on logout by its hash in one query", async () => {
    await expect(sessions.logout("current")).resolves.toBeUndefined();

    expect(repository.revokeActiveByHash).toHaveBeenCalledWith(
      sha256("current"),
    );
    expect(repository.findActiveByHash).not.toHaveBeenCalled();
  });

  it("deletes expired sessions, so the table doesn't grow without limit", async () => {
    await expect(sessions.deleteExpired()).resolves.toBe(4);
  });
});
