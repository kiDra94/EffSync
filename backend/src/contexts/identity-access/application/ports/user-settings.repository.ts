import type { Theme } from "../../domain/user-settings";

/** The users' settings (table user_settings, decision Q8f; Prisma in infrastructure). */
export abstract class UserSettingsRepository {
  abstract find(userId: number): Promise<{ theme: Theme } | null>;
  abstract save(userId: number, theme: Theme): Promise<void>;
}
