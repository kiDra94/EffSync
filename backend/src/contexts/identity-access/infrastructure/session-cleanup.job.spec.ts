import { SessionCleanupJob } from "./session-cleanup.job";
import { SessionService } from "../application/session.service";

describe("SessionCleanupJob", () => {
  it("deletes the expired sessions", async () => {
    const sessions = { deleteExpired: jest.fn().mockResolvedValue(2) };

    await new SessionCleanupJob(sessions as unknown as SessionService).run();

    expect(sessions.deleteExpired).toHaveBeenCalledTimes(1);
  });
});
