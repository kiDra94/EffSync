import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  NewRefreshToken,
  RefreshTokenRepository,
} from "../../application/ports/refresh-token.repository";

/** Sessions on Prisma; joins the use case's open transaction (unit of work). */
@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  create(token: NewRefreshToken) {
    return this.unitOfWork.client().refresh_tokens.create({
      data: token,
      select: { id: true },
    });
  }

  findActiveByHash(tokenHash: string) {
    return this.unitOfWork.client().refresh_tokens.findFirst({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: {
        users: { include: { user_roles: { include: { roles: true } } } },
      },
    });
  }

  async revokeIfActive(id: number) {
    const { count } = await this.unitOfWork.client().refresh_tokens.updateMany({
      where: { id, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return count === 1;
  }

  async revokeActiveByHash(tokenHash: string) {
    await this.unitOfWork.client().refresh_tokens.updateMany({
      where: { token_hash: tokenHash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async deleteExpired() {
    const { count } = await this.unitOfWork.client().refresh_tokens.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });
    return count;
  }
}
