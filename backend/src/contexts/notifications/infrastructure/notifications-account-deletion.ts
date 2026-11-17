import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  AccountDeletionRegistry,
  GHOST_USER,
  type AccountDeletionParticipant,
} from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";

/**
 * notifications' part of an account deletion (T10, decision H1, moved here
 * in M23): the user's own notifications go; in other members' chat
 * notifications (communication writes them as "💬 <name>: <text>") the name
 * becomes the ghost user's, the message stays (review M14 (3)). email_logs
 * and email_preferences cascade.
 */
@Injectable()
export class NotificationsAccountDeletion
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
    // the name as the chat notifications wrote it (identity data read the
    // same way as before M23; the row still exists while participants run)
    const user = await tx.users.findUniqueOrThrow({
      where: { user_id: userId },
      select: { firstname: true, lastname: true, username: true },
    });
    const senderName =
      `${user.firstname} ${user.lastname}`.trim() || user.username;
    const prefix = `💬 ${senderName}:`;
    const ghostPrefix = `💬 ${GHOST_USER.firstname} ${GHOST_USER.lastname}:`;
    await tx.$executeRaw`UPDATE "notifications" SET "text" = ${ghostPrefix} || substr("text", char_length(${prefix}) + 1) WHERE "type" = 'chat_message' AND starts_with("text", ${prefix})`;

    await tx.notifications.deleteMany({ where: { user_id: userId } });
  }
}
