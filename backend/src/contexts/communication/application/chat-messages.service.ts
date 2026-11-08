import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Notifier } from "../../notifications/application";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { chatNotificationText, senderName } from "../domain/chat-notification";
import { ChatMessageRepository } from "./ports/chat-message.repository";

/** A new message (CreateChatMessageDto satisfies it). */
interface NewChatMessage {
  room_id: number;
  user_id: number;
  message: string;
  file_path?: string;
}

/** Messages of a room: only its active members read and write (T96). */
@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(
    private readonly messages: ChatMessageRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly notifier: Notifier,
  ) {}

  async createMsg(input: NewChatMessage) {
    const message = await this.unitOfWork.run(async () => {
      // BUG (kept from before M20, M21): plain errors, so a non-member gets 500
      if (!(await this.messages.roomExists(input.room_id)))
        throw new Error("Room does not exists!");
      if (
        (await this.messages.countActiveMemberships(
          input.room_id,
          input.user_id,
        )) === 0
      )
        throw new Error("User not in Chatroom!");

      return this.messages.create({
        room_id: input.room_id,
        user_id: input.user_id,
        message: input.message,
      });
    });

    // the other members hear about it; a failure doesn't fail the message
    try {
      const name = senderName(await this.messages.findSender(input.user_id));
      const text = chatNotificationText(name, input.message);
      for (const memberId of await this.messages.findActiveMemberIds(
        input.room_id,
      )) {
        if (memberId === input.user_id) continue;
        await this.notifier.notify({
          userId: memberId,
          type: "chat_message",
          text,
        });
      }
    } catch (error) {
      this.logger.error("Failed to send chat notifications", error);
    }

    return message;
  }

  findOne(id: number) {
    return this.messages.findById(id);
  }

  async findByRoom(roomId: number, userId: number) {
    if (!(await this.messages.findActiveMembership(roomId, userId)))
      throw new ForbiddenException("You are not a member of this room!");
    return this.messages.findByRoom(roomId);
  }

  updateMsg(id: number, message: string) {
    return this.messages.update(Number(id), message);
  }

  deleteMessage(messageId: number) {
    return this.messages.delete(messageId);
  }

  // T96: only the author, while still a member of the room, edits or deletes a message
  async assertCanModify(messageId: number, userId: number) {
    const msg = await this.messages.findById(Number(messageId));
    if (!msg) throw new NotFoundException("Message not found!");
    if (msg.user_id !== Number(userId))
      throw new ForbiddenException("Not your message!");

    if (
      !(await this.messages.findActiveMembership(msg.room_id, Number(userId)))
    )
      throw new ForbiddenException("You are not a member of this room!");
    return msg;
  }
}
