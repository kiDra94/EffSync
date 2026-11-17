import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PermissionsService } from "../../identity-access/application";
import { ClassChatService } from "../../school-organization/application";
import { TaskChatService } from "../../task-management/application";
import { directChatHash } from "../domain/direct-chat";
import { ChatRealtime } from "./chat-realtime";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { ChatRoomRepository } from "./ports/chat-room.repository";
import type { ChatLink, NewChatRoom } from "./ports/chat-records";

/** Chat rooms and memberships (T02, T96, decision Q14). */
@Injectable()
export class ChatRoomsService {
  constructor(
    private readonly rooms: ChatRoomRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly permissions: PermissionsService,
    private readonly taskChats: TaskChatService,
    private readonly classChats: ClassChatService,
    private readonly realtime: ChatRealtime,
  ) {}

  /**
   * The one DM of two users (T113, 07_…:267-269): the server builds the
   * hash from both IDs; a second request, from either side, gets the same
   * room, and both are (again) its members.
   */
  async openDirect(requesterId: number, partnerId: number) {
    if (partnerId === requesterId) {
      throw new BadRequestException("Kein Direktchat mit sich selbst");
    }
    // an active account (the ghost user and unknown IDs have no permissions)
    if (!(await this.permissions.hasPermission(partnerId, "view_dashboard"))) {
      throw new NotFoundException(`Benutzer ${partnerId} nicht gefunden`);
    }
    const hash = directChatHash(requesterId, partnerId);
    const people = [requesterId, partnerId];
    // under a lock, so two first requests make one room (review M21)
    const { room, added } = await this.unitOfWork.run(async () => {
      await this.rooms.lockDirect(hash);
      const existing = await this.rooms.findByHash(hash);
      if (!existing) {
        return {
          room: await this.rooms.createDirect(hash, requesterId, partnerId),
          added: people,
        };
      }
      // a DM is the pair's one conversation: both are (again) in it
      return {
        room: existing,
        added: await this.rooms.ensureMembers(existing.room_id, people),
      };
    });
    this.realtime.subscribeUsersToRoom(added, room.room_id);
    return room;
  }

  /** The chat of a task (T29): for whoever sees the task; its people are members. */
  async openTaskChat(taskId: number, requesterId: number) {
    const task = await this.taskChats.forChat(taskId, requesterId);
    if (!task) throw new NotFoundException(`Aufgabe ${taskId} nicht gefunden`);
    return this.openLinked(
      { task_id: taskId },
      `Aufgabe: ${task.title ?? taskId}`,
      // the task's creator owns its chat, not whoever opens it first
      task.creatorId ?? requesterId,
      requesterId,
      task.participantIds,
    );
  }

  /** The chat of a class (T29, decision D2): for its students and teachers. */
  async openClassChat(classId: number, requesterId: number) {
    const cls = await this.classChats.forChat(classId);
    if (!cls) throw new NotFoundException(`Klasse ${classId} nicht gefunden`);
    if (!cls.memberIds.includes(requesterId)) {
      throw new ForbiddenException(
        "Nur Mitglieder der Klasse öffnen ihren Chat",
      );
    }
    return this.openLinked(
      { class_id: classId },
      `${cls.name ?? `Klasse ${classId}`} Klassenchat`,
      // the head teacher owns the class chat, not whoever opens it first
      cls.headTeacherId ?? requesterId,
      requesterId,
      cls.memberIds,
    );
  }

  /**
   * One linked chat, found or created under a lock; the requester is (again)
   * a member, the other people only if they never were (leaving sticks).
   */
  private async openLinked(
    link: ChatLink,
    name: string,
    ownerId: number,
    requesterId: number,
    peopleIds: number[],
  ) {
    const { room, added } = await this.unitOfWork.run(async () => {
      await this.rooms.lockLink(link);
      const found =
        (await this.rooms.findLinked(link)) ??
        (await this.rooms.createLinked(link, name, ownerId));
      const rejoined = await this.rooms.ensureMembers(found.room_id, [
        requesterId,
      ]);
      const others = await this.rooms.addNewMembers(
        found.room_id,
        peopleIds.filter((id) => id !== requesterId),
      );
      return { room: found, added: [...rejoined, ...others] };
    });
    this.realtime.subscribeUsersToRoom(added, room.room_id);
    return room;
  }

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
