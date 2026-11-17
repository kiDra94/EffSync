import type { Sender } from "../../domain/chat-notification";
import type {
  ChatMessageRecord,
  ChatMessageWithAuthor,
  MembershipRecord,
} from "./chat-records";

/** Chat messages (port); the queries ChatMessagesService made before M20. */
export abstract class ChatMessageRepository {
  abstract roomExists(roomId: number): Promise<boolean>;
  abstract countActiveMemberships(
    roomId: number,
    userId: number,
  ): Promise<number>;
  abstract findActiveMembership(
    roomId: number,
    userId: number,
  ): Promise<MembershipRecord | null>;
  abstract findActiveMemberIds(roomId: number): Promise<number[]>;
  /** The sender's name (identity data read the same way as before M20). */
  abstract findSender(userId: number): Promise<Sender | null>;

  abstract create(message: {
    room_id: number;
    user_id: number;
    message: string;
  }): Promise<ChatMessageRecord>;
  abstract findById(messageId: number): Promise<ChatMessageRecord | null>;
  abstract findByRoom(roomId: number): Promise<ChatMessageWithAuthor[]>;
  abstract update(
    messageId: number,
    message: string,
  ): Promise<ChatMessageRecord>;
  abstract delete(messageId: number): Promise<ChatMessageRecord>;
}
