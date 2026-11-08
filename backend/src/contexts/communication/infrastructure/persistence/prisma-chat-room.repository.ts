import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { ChatRoomRepository } from "../../application/ports/chat-room.repository";
import type {
  MembershipRecord,
  NewChatRoom,
} from "../../application/ports/chat-records";

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
        task_id: room.task_id,
        class_id: room.class_id,
        is_private: room.is_private ?? false,
        direct_chat_hash: room.direct_chat_hash,
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
