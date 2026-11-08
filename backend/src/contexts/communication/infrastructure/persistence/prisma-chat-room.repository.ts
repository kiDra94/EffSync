import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { ChatRoomRepository } from "../../application/ports/chat-room.repository";
import type {
  ChatLink,
  MembershipRecord,
  NewChatRoom,
} from "../../application/ports/chat-records";

// keys of pg_advisory_xact_lock(kind, id) for a linked chat's find-or-create
const LINK_LOCK = { task: 2101, class: 2102 } as const;

/** Chat rooms on Prisma: the queries ChatRoomsService made before M20. */
@Injectable()
export class PrismaChatRoomRepository extends ChatRoomRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  create(room: NewChatRoom, creatorId: number) {
    return this.db.chat_rooms.create({
      data: {
        name: room.name,
        // T29 (M21): links only through the task and class chat routes, so
        // nobody takes over a task's or class's chat with a room of their own
        task_id: null,
        class_id: null,
        is_private: room.is_private ?? false,
        // T113 (M21): never the client's hash; DMs build it in createDirect
        direct_chat_hash: null,
        created_by: creatorId,
        chat_room_users: { create: { user_id: creatorId } },
      },
    });
  }

  findActiveOf(userId: number) {
    return this.db.chat_rooms.findMany({
      where: {
        chat_room_users: { some: { user_id: userId, left_at: null } },
      },
      include: {
        chat_room_users: {
          where: { left_at: null },
          select: {
            user_id: true,
            joined_at: true,
            users: {
              select: {
                user_id: true,
                firstname: true,
                lastname: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async findActiveRoomIds(userId: number) {
    const memberships = await this.db.chat_room_users.findMany({
      where: { user_id: userId, left_at: null },
      select: { room_id: true },
    });
    return memberships.map((membership) => membership.room_id);
  }

  findByHash(hash: string) {
    return this.db.chat_rooms.findUnique({ where: { direct_chat_hash: hash } });
  }

  createDirect(hash: string, creatorId: number, partnerId: number) {
    return this.db.chat_rooms.create({
      data: {
        name: null,
        is_private: true,
        direct_chat_hash: hash,
        created_by: creatorId,
        chat_room_users: {
          create: [{ user_id: creatorId }, { user_id: partnerId }],
        },
      },
    });
  }

  async lockDirect(hash: string) {
    // the function returns void, which the driver adapter can't read back
    await this.db
      .$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${hash}))`;
  }

  findLinked(link: ChatLink) {
    return this.db.chat_rooms.findFirst({
      where: { ...link, is_private: false },
      orderBy: { room_id: "asc" },
    });
  }

  createLinked(link: ChatLink, name: string, ownerId: number) {
    return this.db.chat_rooms.create({
      data: { ...link, name, is_private: false, created_by: ownerId },
    });
  }

  async lockLink(link: ChatLink) {
    const [kind, id] =
      "task_id" in link
        ? [LINK_LOCK.task, link.task_id]
        : [LINK_LOCK.class, link.class_id];
    // the function returns void, which the driver adapter can't read back
    await this.db
      .$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${kind}::int, ${id}::int)`;
  }

  async ensureMembers(roomId: number, userIds: number[]) {
    const active = await this.db.chat_room_users.findMany({
      where: { room_id: roomId, user_id: { in: userIds }, left_at: null },
      select: { user_id: true },
    });
    return this.addMissing(roomId, userIds, active);
  }

  async addNewMembers(roomId: number, userIds: number[]) {
    const known = await this.db.chat_room_users.findMany({
      where: { room_id: roomId, user_id: { in: userIds } },
      select: { user_id: true },
    });
    return this.addMissing(roomId, userIds, known);
  }

  private async addMissing(
    roomId: number,
    userIds: number[],
    present: { user_id: number }[],
  ) {
    const presentIds = new Set(present.map((member) => member.user_id));
    const missing = [...new Set(userIds)].filter((id) => !presentIds.has(id));
    if (missing.length > 0) {
      await this.db.chat_room_users.createMany({
        data: missing.map((user_id) => ({ room_id: roomId, user_id })),
      });
    }
    return missing;
  }

  findById(roomId: number) {
    return this.db.chat_rooms.findUnique({ where: { room_id: roomId } });
  }

  async exists(roomId: number) {
    return !!(await this.db.chat_rooms.findUnique({
      where: { room_id: roomId },
      select: { room_id: true },
    }));
  }

  findCreator(roomId: number) {
    return this.db.chat_rooms.findUnique({
      where: { room_id: roomId },
      select: { created_by: true },
    });
  }

  update(roomId: number, data: { name?: string }) {
    return this.db.chat_rooms.update({ where: { room_id: roomId }, data });
  }

  async delete(roomId: number) {
    const tx = this.db;
    await tx.chat_room_users.deleteMany({ where: { room_id: roomId } });
    await tx.chat_messages.deleteMany({ where: { room_id: roomId } });
    return tx.chat_rooms.delete({ where: { room_id: roomId } });
  }

  findActiveMembership(roomId: number, userId: number) {
    return this.db.chat_room_users.findFirst({
      where: { room_id: roomId, user_id: userId, left_at: null },
    });
  }

  addMember(roomId: number, userId: number) {
    return this.db.chat_room_users.create({
      data: { room_id: roomId, user_id: userId },
    });
  }

  endMembership(membership: MembershipRecord) {
    return this.db.chat_room_users.update({
      where: {
        room_id_user_id_joined_at: {
          room_id: membership.room_id,
          user_id: membership.user_id,
          joined_at: membership.joined_at,
        },
      },
      data: { left_at: new Date() },
    });
  }
}
