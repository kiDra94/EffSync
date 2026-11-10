import { Injectable } from "@nestjs/common";
import { DEFAULT_THEME, Theme } from "../domain/user-settings";
import { UserSettingsRepository } from "./ports/user-settings.repository";

/**
 * The signed-in user's settings (T68, decision Q8f, M25): stored on the
 * server, so the theme follows the user to every browser and device.
 */
@Injectable()
export class UserSettingsService {
  constructor(private readonly settings: UserSettingsRepository) {}

  async find(userId: number): Promise<{ theme: Theme }> {
    return {
      theme: (await this.settings.find(userId))?.theme ?? DEFAULT_THEME,
    };
  }

  async update(userId: number, changes: { theme: Theme }) {
    await this.settings.save(userId, changes.theme);
    return { theme: changes.theme };
  }
}
