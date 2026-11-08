import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { ChatMessageRepository } from "../../application/ports/chat-message.repository";

/** Chat messages on Prisma: the queries ChatMessagesService made before M20. */
@Injectable()
export class PrismaChatMessageRepository extends ChatMessageRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  async roomExists(roomId: number) {
    return !!(await this.db.chat_rooms.findUnique({
      where: { room_id: roomId },
    }));
  }

  countActiveMemberships(roomId: number, userId: number) {
    return this.db.chat_room_users.count({
      where: { room_id: roomId, user_id: userId, left_at: null },
    });
  }

  findActiveMembership(roomId: number, userId: number) {
    return this.db.chat_room_users.findFirst({
      where: { room_id: roomId, user_id: userId, left_at: null },
    });
  }

  async findActiveMemberIds(roomId: number) {
    const members = await this.db.chat_room_users.findMany({
      where: { room_id: roomId, left_at: null },
      select: { user_id: true },
    });
    return members.map((member) => member.user_id);
  }

  findSender(userId: number) {
    return this.db.users.findUnique({
      where: { user_id: userId },
      select: { firstname: true, lastname: true, username: true },
    });
  }

  create(message: { room_id: number; user_id: number; message: string }) {
    return this.db.chat_messages.create({ data: message });
  }

  findById(messageId: number) {
    return this.db.chat_messages.findUnique({
      where: { message_id: messageId },
    });
  }

  findByRoom(roomId: number) {
    return this.db.chat_messages.findMany({
      where: { room_id: roomId },
      orderBy: { created_at: "asc" },
      include: {
        users: {
          select: {
            user_id: true,
            username: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });
  }

  update(messageId: number, message: string) {
    return this.db.chat_messages.update({
      where: { message_id: messageId },
      data: { message, updated_at: new Date() },
    });
  }

  delete(messageId: number) {
    return this.db.chat_messages.delete({ where: { message_id: messageId } });
  }
}
