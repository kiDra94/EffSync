import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { ChatRoomRepository } from "./ports/chat-room.repository";
import type { NewChatRoom } from "./ports/chat-records";

/** Chat rooms and memberships (T02, T96, decision Q14). */
@Injectable()
export class ChatRoomsService {
  constructor(
    private readonly rooms: ChatRoomRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  createRoom(room: NewChatRoom, userId: number) {
    return this.rooms.create(room, userId);
  }

  findRoomsByUser(userId: number) {
    return this.rooms.findActiveOf(userId);
  }

  findOne(roomId: number) {
    return this.rooms.findById(roomId);
  }

  updateRoom(roomId: number, updateData: { name?: string }) {
    return this.rooms.update(roomId, updateData);
  }

  async deleteRoom(roomId: number, userId: number) {
    const room = await this.rooms.findById(roomId);
    if (!room) throw new NotFoundException("Room not found");
    if (room.created_by !== userId)
      throw new ForbiddenException("Only the creator can delete this room");

    return this.unitOfWork.run(() => this.rooms.delete(roomId));
  }

  joinRoom(roomId: number, userId: number) {
    return this.unitOfWork.run(async () => {
      if (!(await this.rooms.findById(roomId)))
        throw new NotFoundException("Room does not exist!");

      const membership = await this.rooms.findActiveMembership(roomId, userId);
      if (membership) return membership;
      return this.rooms.addMember(roomId, userId);
    });
  }

  leaveRoom(roomId: number, userId: number) {
    return this.unitOfWork.run(async () => {
      const membership = await this.rooms.findActiveMembership(roomId, userId);
      if (!membership) return null;
      return this.rooms.endMembership(membership);
    });
  }

  async assertIsMember(roomId: number, userId: number) {
    if (!(await this.rooms.exists(roomId)))
      throw new NotFoundException("Room not found!");

    if (!(await this.rooms.findActiveMembership(roomId, userId)))
      throw new ForbiddenException("You are not a member of this room!");
  }

  async assertIsCreator(roomId: number, userId: number) {
    const room = await this.rooms.findCreator(roomId);
    if (!room) throw new NotFoundException("Room not found!");
    if (room.created_by !== userId)
      throw new ForbiddenException("Only the room creator can do this!");
  }
}
