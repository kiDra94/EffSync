import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { AvatarRepository } from "../../application/ports/avatar.repository";

/** The profile pictures on Prisma (table user_avatars, decision Q8c, M27). */
@Injectable()
export class PrismaAvatarRepository extends AvatarRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  find(userId: number) {
    return this.db.user_avatars.findUnique({
      where: { user_id: userId },
      select: { mime_type: true, data: true },
    });
  }

  async findVersion(userId: number) {
    const row = await this.db.user_avatars.findUnique({
      where: { user_id: userId },
      select: { updated_at: true },
    });
    return row?.updated_at ?? null;
  }

  async save(userId: number, mimeType: string, data: Buffer) {
    const updated_at = new Date();
    const row = { mime_type: mimeType, data: new Uint8Array(data), updated_at };
    await this.db.user_avatars.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...row },
      update: row,
    });
    return updated_at;
  }

  async remove(userId: number) {
    await this.db.user_avatars.deleteMany({ where: { user_id: userId } });
  }
}
