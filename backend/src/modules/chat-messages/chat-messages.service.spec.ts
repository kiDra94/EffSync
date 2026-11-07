import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ChatMessagesService } from "./chat-messages.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("ChatMessagesService", () => {
  let service: ChatMessagesService;
  const prisma = {
    chat_room_users: { findFirst: jest.fn() },
    chat_messages: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<ChatMessagesService>(ChatMessagesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // T96 (M6): only an active member reads a room's messages
  describe("findByRoom", () => {
    it("returns the messages to an active member", async () => {
      prisma.chat_room_users.findFirst.mockResolvedValue({ room_id: 2 });

      await service.findByRoom(2, 4);

      expect(prisma.chat_room_users.findFirst).toHaveBeenCalledWith({
        where: { room_id: 2, user_id: 4, left_at: null },
      });
      expect(prisma.chat_messages.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { room_id: 2 } }),
      );
    });

    it("refuses anyone who isn't an active member with 403", async () => {
      prisma.chat_room_users.findFirst.mockResolvedValue(null);

      await expect(service.findByRoom(1, 9)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.chat_messages.findMany).not.toHaveBeenCalled();
    });
  });

  // T96 (M6 review): only the author who is still a member edits or deletes a message
  describe("assertCanModify", () => {
    it("returns the message for its author who is still a member", async () => {
      prisma.chat_messages.findUnique.mockResolvedValue({
        message_id: 7,
        room_id: 2,
        user_id: 4,
      });
      prisma.chat_room_users.findFirst.mockResolvedValue({ room_id: 2 });

      await expect(service.assertCanModify(7, 4)).resolves.toMatchObject({
        message_id: 7,
      });
      expect(prisma.chat_room_users.findFirst).toHaveBeenCalledWith({
        where: { room_id: 2, user_id: 4, left_at: null },
      });
    });

    it("refuses another user's message", async () => {
      prisma.chat_messages.findUnique.mockResolvedValue({
        room_id: 2,
        user_id: 4,
      });

      await expect(service.assertCanModify(7, 9)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses the author after they left the room", async () => {
      prisma.chat_messages.findUnique.mockResolvedValue({
        room_id: 2,
        user_id: 4,
      });
      prisma.chat_room_users.findFirst.mockResolvedValue(null);

      await expect(service.assertCanModify(7, 4)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws 404 for an unknown message", async () => {
      prisma.chat_messages.findUnique.mockResolvedValue(null);

      await expect(service.assertCanModify(7, 4)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
