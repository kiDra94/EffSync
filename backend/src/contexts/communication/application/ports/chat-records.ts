/**
 * Row shapes the communication ports return: Prisma's generated types,
 * imported type-only (decision G1).
 */
import type { Prisma } from "@prisma/client";

export type ChatRoomRecord = Prisma.chat_roomsGetPayload<object>;
export type ChatRoomWithMembers = Prisma.chat_roomsGetPayload<{
  include: {
    chat_room_users: {
      select: {
        user_id: true;
        joined_at: true;
        users: {
          select: {
            user_id: true;
            firstname: true;
            lastname: true;
            username: true;
          };
        };
      };
    };
  };
}>;
export type MembershipRecord = Prisma.chat_room_usersGetPayload<object>;
export type ChatMessageRecord = Prisma.chat_messagesGetPayload<object>;
export type ChatMessageWithAuthor = Prisma.chat_messagesGetPayload<{
  include: {
    users: {
      select: {
        user_id: true;
        username: true;
        firstname: true;
        lastname: true;
      };
    };
  };
}>;

/** What a group chat is linked to (T29, M21). */
export type ChatLink = { task_id: number } | { class_id: number };

export interface NewChatRoom {
  name?: string;
  task_id?: number;
  class_id?: number;
  is_private?: boolean;
  direct_chat_hash?: string;
}
