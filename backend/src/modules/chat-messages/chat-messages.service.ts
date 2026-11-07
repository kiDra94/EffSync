import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";
import { UpdateChatMessageDto } from "./dto/update-chat-message.dto";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ChatMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}
  async createMsg(createChatMessageDto: CreateChatMessageDto) {
    const message = await this.prisma.$transaction(async (trans) => {
      await this.validateTrans(
        trans,
        createChatMessageDto.room_id,
        createChatMessageDto.user_id,
      );
      return trans.chat_messages.create({
        data: {
          room_id: createChatMessageDto.room_id,
          user_id: createChatMessageDto.user_id,
          message: createChatMessageDto.message,
        },
      });
    });

    // Send notifications to all other room members
    try {
      const sender = await this.prisma.users.findUnique({
        where: { user_id: createChatMessageDto.user_id },
        select: { firstname: true, lastname: true, username: true },
      });
      const senderName = sender
        ? `${sender.firstname} ${sender.lastname}`.trim() || sender.username
        : "Jemand";

      const roomMembers = await this.prisma.chat_room_users.findMany({
        where: { room_id: createChatMessageDto.room_id, left_at: null },
        select: { user_id: true },
      });

      for (const member of roomMembers) {
        if (member.user_id === createChatMessageDto.user_id) continue;
        await this.notificationsService.create({
          user_id: member.user_id,
          text: `💬 ${senderName}: ${createChatMessageDto.message.substring(0, 80)}${createChatMessageDto.message.length > 80 ? "..." : ""}`,
          type: "chat_message",
          is_read: false,
        });
      }
    } catch (error) {
      console.error("Failed to send chat notifications:", error);
    }

    return message;
  }

  findOne(id: number) {
    return this.prisma.chat_messages.findUnique({ where: { message_id: id } });
  }

  async findByRoom(roomId: number, userId: number) {
    const membership = await this.prisma.chat_room_users.findFirst({
      where: { room_id: roomId, user_id: userId, left_at: null },
    });
    if (!membership)
      throw new ForbiddenException("You are not a member of this room!");

    return this.prisma.chat_messages.findMany({
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

  async updateMsg(id: number, message: string) {
    return this.prisma.chat_messages.update({
      where: { message_id: Number(id) },
      data: { message, updated_at: new Date() },
    });
  }

  async deleteMessage(message_id: number) {
    return this.prisma.chat_messages.delete({ where: { message_id } });
  }

  private async validateTrans(
    trans: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    roomId: number,
    userId: number,
  ) {
    const room = await trans.chat_rooms.findUnique({
      where: { room_id: roomId },
    });
    if (!room) throw new Error("Room does not exists!");

    const count = await trans.chat_room_users.count({
      where: {
        room_id: roomId,
        user_id: userId,
        left_at: null,
      },
    });
    if (count === 0) throw new Error("User not in Chatroom!");
  }

  // T96: only the author, while still a member of the room, edits or deletes a message
  async assertCanModify(messageId: number, userId: number) {
    const msg = await this.prisma.chat_messages.findUnique({
      where: { message_id: Number(messageId) },
    });
    if (!msg) throw new NotFoundException("Message not found!");
    if (msg.user_id !== Number(userId))
      throw new ForbiddenException("Not your message!");

    const membership = await this.prisma.chat_room_users.findFirst({
      where: { room_id: msg.room_id, user_id: Number(userId), left_at: null },
    });
    if (!membership)
      throw new ForbiddenException("You are not a member of this room!");
    return msg;
  }
}
