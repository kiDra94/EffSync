import type { UserSettingsRepository } from "./ports/user-settings.repository";
import { UserSettingsService } from "./user-settings.service";

// T68, decision Q8f (M25): the theme per user, light until changed
describe("UserSettingsService", () => {
  let repository: { find: jest.Mock; save: jest.Mock };
  let service: UserSettingsService;

  beforeEach(() => {
    repository = {
      find: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    service = new UserSettingsService(
      repository as unknown as UserSettingsRepository,
    );
  });

  it("answers the light theme for a user who never chose one", async () => {
    await expect(service.find(4)).resolves.toEqual({ theme: "light" });
  });

  it("answers the stored theme", async () => {
    repository.find.mockResolvedValue({ theme: "dark" });

    await expect(service.find(4)).resolves.toEqual({ theme: "dark" });
    expect(repository.find).toHaveBeenCalledWith(4);
  });

  it("stores a new theme for the user", async () => {
    await expect(service.update(4, { theme: "system" })).resolves.toEqual({
      theme: "system",
    });
    expect(repository.save).toHaveBeenCalledWith(4, "system");
  });
});
