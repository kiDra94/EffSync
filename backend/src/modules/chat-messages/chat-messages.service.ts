import { Injectable } from "@nestjs/common";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";
import { UpdateChatMessageDto } from "./dto/update-chat-message.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ChatMessagesService {
  constructor(private readonly prisma: PrismaService) { }
  async createMsg(createChatMessageDto: CreateChatMessageDto) {
    return this.prisma.$transaction(async (trans) => {
      const room = await trans.chat_rooms.findUnique({ where: { room_id: createChatMessageDto.room_id } });
      if (!room) throw new Error('Room does not exists!');

      const count = await trans.chat_room_users.count({
        where: {
          room_id: createChatMessageDto.room_id,
          user_id: createChatMessageDto.user_id,
          left_at: null,
        }
      })
      if (count === 0) throw new Error('User not in Chatroom!');
      return trans.chat_messages.create({
        data: {
          room_id: createChatMessageDto.room_id,
          user_id: createChatMessageDto.user_id,
          message: createChatMessageDto.message,
        }
      })
    });

  }

  findAll() {
    return `This action returns all chatMessages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chatMessage`;
  }

  update(id: number, updateChatMessageDto: UpdateChatMessageDto) {
    return `This action updates a #${id} chatMessage`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatMessage`;
  }
}
