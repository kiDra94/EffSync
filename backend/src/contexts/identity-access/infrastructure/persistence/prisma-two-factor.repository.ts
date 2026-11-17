import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { TwoFactorRepository } from "../../application/ports/two-factor.repository";

/** The TOTP secrets on Prisma (table user_two_factor, decision Q8d, M32). */
@Injectable()
export class PrismaTwoFactorRepository extends TwoFactorRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  find(userId: number) {
    return this.db.user_two_factor.findUnique({ where: { user_id: userId } });
  }

  async savePending(userId: number, secretEncrypted: string) {
    await this.db.user_two_factor.upsert({
      where: { user_id: userId },
      create: { user_id: userId, secret_encrypted: secretEncrypted },
      update: { secret_encrypted: secretEncrypted, enabled_at: null },
    });
  }

  async markEnabled(userId: number, at: Date) {
    await this.db.user_two_factor.update({
      where: { user_id: userId },
      data: { enabled_at: at },
    });
  }

  async delete(userId: number) {
    const { count } = await this.db.user_two_factor.deleteMany({
      where: { user_id: userId },
    });
    return count > 0;
  }
}
