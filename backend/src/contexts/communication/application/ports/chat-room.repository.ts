import type {
  ChatLink,
  ChatRoomRecord,
  ChatRoomWithMembers,
  MembershipRecord,
  NewChatRoom,
} from "./chat-records";

/**
 * Chat rooms and their memberships (port; Prisma in infrastructure): the
 * queries ChatRoomsService made before M20 (decision G1). A membership is
 * active while `left_at` is null (T128).
 */
export abstract class ChatRoomRepository {
  /** The room, with its creator as the first member. */
  abstract create(
    room: NewChatRoom,
    creatorId: number,
  ): Promise<ChatRoomRecord>;
  /** The rooms the user is an active member of, with their active members. */
  abstract findActiveOf(userId: number): Promise<ChatRoomWithMembers[]>;
  /** The IDs of the user's active rooms (a socket's channels, M20). */
  abstract findActiveRoomIds(userId: number): Promise<number[]>;
  abstract findById(roomId: number): Promise<ChatRoomRecord | null>;
  abstract exists(roomId: number): Promise<boolean>;
  abstract findCreator(
    roomId: number,
  ): Promise<{ created_by: number | null } | null>;
  abstract update(
    roomId: number,
    data: { name?: string },
  ): Promise<ChatRoomRecord>;
  /** Deletes the room with its memberships and messages. */
  abstract delete(roomId: number): Promise<ChatRoomRecord>;

  // T113, T29 (M21): DMs by their hash, chats linked to a task or a class.
  // The find-or-create runs under lockDirect/lockLink in one unit of work.
  abstract findByHash(hash: string): Promise<ChatRoomRecord | null>;
  /** A private room with the hash and both users as members. */
  abstract createDirect(
    hash: string,
    creatorId: number,
    partnerId: number,
  ): Promise<ChatRoomRecord>;
  abstract lockDirect(hash: string): Promise<void>;
  abstract findLinked(link: ChatLink): Promise<ChatRoomRecord | null>;
  abstract createLinked(
    link: ChatLink,
    name: string,
    ownerId: number,
  ): Promise<ChatRoomRecord>;
  abstract lockLink(link: ChatLink): Promise<void>;
  /** Gives each user an active membership; returns those who got a new one. */
  abstract ensureMembers(roomId: number, userIds: number[]): Promise<number[]>;
  /**
   * Adds only users who never were members, so leaving or a removal
   * sticks; returns those added.
   */
  abstract addNewMembers(roomId: number, userIds: number[]): Promise<number[]>;

  abstract findActiveMembership(
    roomId: number,
    userId: number,
  ): Promise<MembershipRecord | null>;
  abstract addMember(roomId: number, userId: number): Promise<MembershipRecord>;
  abstract endMembership(
    membership: MembershipRecord,
  ): Promise<MembershipRecord>;
}
