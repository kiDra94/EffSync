import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { PermissionsService } from "../../identity-access/application";
import type { ClassChatService } from "../../school-organization/application";
import type { TaskChatService } from "../../task-management/application";
import type { UnitOfWork } from "../../../shared/application/unit-of-work";
import { directChatHash } from "../domain/direct-chat";
import type { ChatRealtime } from "./chat-realtime";
import { ChatRoomsService } from "./chat-rooms.service";
import type { ChatRoomRepository } from "./ports/chat-room.repository";

// T113 and T29 (M21): one DM per pair, one chat per task and per class
describe("ChatRoomsService DMs and linked chats", () => {
  let rooms: Record<string, jest.Mock>;
  let realtime: { subscribeUsersToRoom: jest.Mock };
  let taskChats: { forChat: jest.Mock };
  let classChats: { forChat: jest.Mock };
  let permissions: { hasPermission: jest.Mock };
  let unitOfWork: { run: jest.Mock };
  let service: ChatRoomsService;

  beforeEach(() => {
    rooms = {
      lockDirect: jest.fn(),
      findByHash: jest.fn().mockResolvedValue(null),
      createDirect: jest.fn().mockResolvedValue({ room_id: 9 }),
      lockLink: jest.fn(),
      findLinked: jest.fn().mockResolvedValue(null),
      createLinked: jest.fn().mockResolvedValue({ room_id: 12 }),
      ensureMembers: jest.fn((_room: number, ids: number[]) =>
        Promise.resolve(ids),
      ),
      addNewMembers: jest.fn((_room: number, ids: number[]) =>
        Promise.resolve(ids),
      ),
    };
    realtime = { subscribeUsersToRoom: jest.fn() };
    taskChats = {
      forChat: jest.fn().mockResolvedValue({
        title: "Referat",
        creatorId: 2,
        participantIds: [2, 4],
      }),
    };
    classChats = {
      forChat: jest.fn().mockResolvedValue({
        name: "5AHITM",
        headTeacherId: 2,
        memberIds: [2, 4, 5],
      }),
    };
    permissions = { hasPermission: jest.fn().mockResolvedValue(true) };
    unitOfWork = { run: jest.fn((work: () => unknown) => work()) };
    service = new ChatRoomsService(
      rooms as unknown as ChatRoomRepository,
      unitOfWork as unknown as UnitOfWork,
      permissions as unknown as PermissionsService,
      taskChats as unknown as TaskChatService,
      classChats as unknown as ClassChatService,
      realtime as unknown as ChatRealtime,
    );
  });

  it("builds the same hash for both orders of the IDs", () => {
    expect(directChatHash(6, 4)).toBe("direct_4_6");
    expect(directChatHash(4, 6)).toBe("direct_4_6");
  });

  // review M21 (1): the partner of a new DM gets it live too
  it("creates a DM under its lock and subscribes both people", async () => {
    await expect(service.openDirect(4, 6)).resolves.toEqual({ room_id: 9 });

    expect(rooms.lockDirect).toHaveBeenCalledWith("direct_4_6");
    expect(rooms.lockDirect.mock.invocationCallOrder[0]).toBeLessThan(
      rooms.findByHash.mock.invocationCallOrder[0],
    );
    expect(rooms.createDirect).toHaveBeenCalledWith("direct_4_6", 4, 6);
    expect(realtime.subscribeUsersToRoom).toHaveBeenCalledWith([4, 6], 9);
  });

  it("returns the existing DM, from either side, with both as members", async () => {
    rooms.findByHash.mockResolvedValue({ room_id: 3 });
    rooms.ensureMembers.mockResolvedValue([4]);

    await expect(service.openDirect(6, 4)).resolves.toEqual({ room_id: 3 });
    expect(rooms.createDirect).not.toHaveBeenCalled();
    expect(rooms.ensureMembers).toHaveBeenCalledWith(3, [6, 4]);
    expect(realtime.subscribeUsersToRoom).toHaveBeenCalledWith([4], 3);
  });

  it("refuses a DM with oneself and with an unknown or inactive user", async () => {
    await expect(service.openDirect(4, 4)).rejects.toThrow(BadRequestException);
    permissions.hasPermission.mockResolvedValue(false);
    await expect(service.openDirect(4, 0)).rejects.toThrow(NotFoundException);
    expect(rooms.createDirect).not.toHaveBeenCalled();
  });

  it("opens one task chat under a lock, owned by the task's creator", async () => {
    await expect(service.openTaskChat(7, 4)).resolves.toEqual({ room_id: 12 });

    expect(rooms.lockLink).toHaveBeenCalledWith({ task_id: 7 });
    expect(rooms.lockLink.mock.invocationCallOrder[0]).toBeLessThan(
      rooms.findLinked.mock.invocationCallOrder[0],
    );
    // review M21 (7): not whoever opens it first
    expect(rooms.createLinked).toHaveBeenCalledWith(
      { task_id: 7 },
      "Aufgabe: Referat",
      2,
    );
    expect(rooms.ensureMembers).toHaveBeenCalledWith(12, [4]);
    expect(rooms.addNewMembers).toHaveBeenCalledWith(12, [2]);
    expect(realtime.subscribeUsersToRoom).toHaveBeenCalledWith([4, 2], 12);

    rooms.findLinked.mockResolvedValue({ room_id: 3 });
    await expect(service.openTaskChat(7, 2)).resolves.toEqual({ room_id: 3 });
    expect(rooms.createLinked).toHaveBeenCalledTimes(1);
  });

  // review M21 (5, 6): the members are added inside the locked unit of work,
  // and only people who never were members are added for the others
  it("adds the other people in the same locked unit of work, never re-adding former members", async () => {
    rooms.addNewMembers.mockResolvedValue([]);
    await service.openTaskChat(7, 4);

    expect(unitOfWork.run).toHaveBeenCalledTimes(1);
    expect(rooms.addNewMembers.mock.invocationCallOrder[0]).toBeGreaterThan(
      rooms.lockLink.mock.invocationCallOrder[0],
    );
    expect(realtime.subscribeUsersToRoom).toHaveBeenCalledWith([4], 12);
  });

  it("gives no task chat to someone who doesn't see the task", async () => {
    taskChats.forChat.mockResolvedValue(null);

    await expect(service.openTaskChat(7, 9)).rejects.toThrow(NotFoundException);
    expect(rooms.createLinked).not.toHaveBeenCalled();
  });

  it("opens the class chat, owned by the head teacher, for the class's members only", async () => {
    await service.openClassChat(1, 4);
    expect(rooms.createLinked).toHaveBeenCalledWith(
      { class_id: 1 },
      "5AHITM Klassenchat",
      2,
    );
    expect(rooms.addNewMembers).toHaveBeenCalledWith(12, [2, 5]);

    await expect(service.openClassChat(1, 9)).rejects.toThrow(
      ForbiddenException,
    );
    classChats.forChat.mockResolvedValue(null);
    await expect(service.openClassChat(8, 4)).rejects.toThrow(
      NotFoundException,
    );
  });
});
