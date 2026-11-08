import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  AccountDeletionRegistry,
  GHOST_USER_ID,
  type AccountDeletionParticipant,
} from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";

/**
 * communication's part of an account deletion (T10, decision H1, moved here
 * in M20): the chat history and the user's rooms stay under the ghost user,
 * the memberships are deleted. Runs in identity-access's deletion unit of
 * work.
 */
@Injectable()
export class CommunicationAccountDeletion
  implements AccountDeletionParticipant, OnModuleInit
{
  constructor(
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly registry: AccountDeletionRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async anonymizeUser(userId: number): Promise<void> {
    const tx = this.unitOfWork.client();
    await tx.chat_messages.updateMany({
      where: { user_id: userId },
      data: { user_id: GHOST_USER_ID },
    });
    await tx.chat_rooms.updateMany({
      where: { created_by: userId },
      data: { created_by: GHOST_USER_ID },
    });
    await tx.chat_room_users.deleteMany({ where: { user_id: userId } });
  }
}
