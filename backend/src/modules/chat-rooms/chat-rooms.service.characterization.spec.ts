/**
 * Characterization tests for ChatRoomsService (GOALS.md M2, T128 flipped in M6).
 */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ChatRoomsService } from "./chat-rooms.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

function createPrismaMock() {
  const prisma = {
    chat_rooms: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chat_room_users: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    chat_messages: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );
  return prisma;
}

describe("ChatRoomsService (characterization, M2)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ChatRoomsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ChatRoomsService(prisma as unknown as PrismaService);
  });

  // T113: the client-supplied direct_chat_hash is stored as is; the server never builds it (M21)
  it("creates a room with the creator as first member and stores a client-supplied DM hash", async () => {
    await service.createRoom(
      { name: "DM", is_private: true, direct_chat_hash: "abc" } as never,
      5,
    );

    expect(prisma.chat_rooms.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "DM",
        is_private: true,
        direct_chat_hash: "abc",
        created_by: 5,
        chat_room_users: { create: { user_id: 5 } },
      }),
    });
  });

  it("defaults is_private to false", async () => {
    await service.createRoom({ name: "Gruppe" } as never, 5);
    expect(prisma.chat_rooms.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ is_private: false }),
    });
  });

  // THESIS: T128 (flipped in M6) – rooms the user has left are no longer listed
  it("lists only the rooms the user is still an active member of", async () => {
    await service.findRoomsByUser(5);

    const args = prisma.chat_rooms.findMany.mock.calls[0][0] as {
      where: unknown;
      include: { chat_room_users: { where: unknown } };
    };
    expect(args.where).toEqual({
      chat_room_users: { some: { user_id: 5, left_at: null } },
    });
    expect(args.include.chat_room_users.where).toEqual({ left_at: null });
  });

  // T96: object-level check through chat_room_users
  describe("assertIsMember", () => {
    it("accepts an active member", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue({ room_id: 1 });
      prisma.chat_room_users.findFirst.mockResolvedValue({
        room_id: 1,
        user_id: 5,
      });

      await expect(service.assertIsMember(1, 5)).resolves.toBeUndefined();
      expect(prisma.chat_room_users.findFirst).toHaveBeenCalledWith({
        where: { room_id: 1, user_id: 5, left_at: null },
      });
    });

    it("rejects someone who isn't (or no longer is) a member with 403", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue({ room_id: 1 });

      await expect(service.assertIsMember(1, 9)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws 404 for an unknown room", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue(null);

      await expect(service.assertIsMember(1, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("joinRoom", () => {
    it("throws 404 for an unknown room", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue(null);
      await expect(service.joinRoom(1, 9)).rejects.toThrow(
        "Room does not exist!",
      );
    });

    it("returns the existing membership instead of creating a second one", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue({ room_id: 1 });
      prisma.chat_room_users.findFirst.mockResolvedValue({
        room_id: 1,
        user_id: 9,
      });

      await expect(service.joinRoom(1, 9)).resolves.toEqual({
        room_id: 1,
        user_id: 9,
      });
      expect(prisma.chat_room_users.create).not.toHaveBeenCalled();
    });

    it("adds a new membership", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue({ room_id: 1 });

      await service.joinRoom(1, 9);

      expect(prisma.chat_room_users.create).toHaveBeenCalledWith({
        data: { room_id: 1, user_id: 9 },
      });
    });
  });

  describe("leaveRoom", () => {
    it("returns null when the user is not an active member", async () => {
      await expect(service.leaveRoom(1, 9)).resolves.toBeNull();
      expect(prisma.chat_room_users.update).not.toHaveBeenCalled();
    });

    it("sets left_at instead of deleting the membership", async () => {
      const joinedAt = new Date("2026-01-01T00:00:00Z");
      prisma.chat_room_users.findFirst.mockResolvedValue({
        room_id: 1,
        user_id: 9,
        joined_at: joinedAt,
      });

      await service.leaveRoom(1, 9);

      expect(prisma.chat_room_users.update).toHaveBeenCalledWith({
        where: {
          room_id_user_id_joined_at: {
            room_id: 1,
            user_id: 9,
            joined_at: joinedAt,
          },
        },
        data: { left_at: expect.any(Date) as Date },
      });
    });
  });

  describe("deleteRoom and assertIsCreator", () => {
    it("lets only the creator delete a room, removing members and messages first", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue({
        room_id: 1,
        created_by: 5,
      });

      await expect(service.deleteRoom(1, 6)).rejects.toThrow(
        ForbiddenException,
      );
      await service.deleteRoom(1, 5);

      expect(prisma.chat_room_users.deleteMany).toHaveBeenCalledWith({
        where: { room_id: 1 },
      });
      expect(prisma.chat_messages.deleteMany).toHaveBeenCalledWith({
        where: { room_id: 1 },
      });
      expect(prisma.chat_rooms.delete).toHaveBeenCalledWith({
        where: { room_id: 1 },
      });
    });

    it("throws 404 when deleting an unknown room", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue(null);
      await expect(service.deleteRoom(1, 5)).rejects.toThrow(NotFoundException);
    });

    it("accepts the creator and rejects everyone else", async () => {
      prisma.chat_rooms.findUnique.mockResolvedValue({ created_by: 5 });

      await expect(service.assertIsCreator(1, 5)).resolves.toBeUndefined();
      await expect(service.assertIsCreator(1, 6)).rejects.toThrow(
        "Only the room creator can do this!",
      );

      prisma.chat_rooms.findUnique.mockResolvedValue(null);
      await expect(service.assertIsCreator(1, 5)).rejects.toThrow(
        "Room not found!",
      );
    });

    it("renames a room and finds one by id", async () => {
      await service.updateRoom(1, { name: "Neu" });
      await service.findOne(1);

      expect(prisma.chat_rooms.update).toHaveBeenCalledWith({
        where: { room_id: 1 },
        data: { name: "Neu" },
      });
      expect(prisma.chat_rooms.findUnique).toHaveBeenCalledWith({
        where: { room_id: 1 },
      });
    });
  });
});
