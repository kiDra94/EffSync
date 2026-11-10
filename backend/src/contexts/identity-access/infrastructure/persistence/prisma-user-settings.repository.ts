import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { UserSettingsRepository } from "../../application/ports/user-settings.repository";
import { THEMES, type Theme } from "../../domain/user-settings";

const isTheme = (value: string): value is Theme =>
  (THEMES as readonly string[]).includes(value);

/** The users' settings on Prisma (table user_settings, decision Q8f, M25). */
@Injectable()
export class PrismaUserSettingsRepository extends UserSettingsRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  async find(userId: number) {
    const row = await this.unitOfWork
      .client()
      .user_settings.findUnique({ where: { user_id: userId } });
    // a value the app doesn't know (edited by hand) counts as none
    return row && isTheme(row.theme) ? { theme: row.theme } : null;
  }

  async save(userId: number, theme: Theme) {
    await this.unitOfWork.client().user_settings.upsert({
      where: { user_id: userId },
      create: { user_id: userId, theme },
      update: { theme },
    });
  }
}
