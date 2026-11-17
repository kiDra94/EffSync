import { ForbiddenException } from "@nestjs/common";
import { Socket } from "socket.io";
import { ChatMessagesService } from "../application/chat-messages.service";
import { ChatRoomsService } from "../application/chat-rooms.service";
import { ChatGateway } from "./chat.gateway";

// the chat's socket events (M6; in modules/websocket until M20, whose
// connection tests are now the shared transport's, socket-io-realtime.spec)
describe("ChatGateway", () => {
  let gateway: ChatGateway;
  let rooms: Record<string, jest.Mock>;
  let roomEmit: jest.Mock;

  const client = (userId: number, rooms: string[] = []) =>
    ({
      id: "socket-1",
      data: { user: { userId, username: `user${userId}` } },
      rooms: new Set(rooms),
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      broadcast: { to: jest.fn(() => ({ emit: broadcastEmit })) },
    }) as unknown as Socket & {
      join: jest.Mock;
      leave: jest.Mock;
      emit: jest.Mock;
    };
  let broadcastEmit: jest.Mock;
  let messages: Record<string, jest.Mock>;

  beforeEach(() => {
    rooms = {
      assertIsMember: jest.fn().mockResolvedValue(undefined),
      assertIsCreator: jest.fn().mockResolvedValue(undefined),
      joinRoom: jest.fn().mockResolvedValue({}),
      leaveRoom: jest.fn().mockResolvedValue({}),
    };
    messages = {
      assertCanModify: jest
        .fn()
        .mockResolvedValue({ message_id: 7, room_id: 2 }),
      updateMsg: jest.fn().mockResolvedValue({ message_id: 7, room_id: 2 }),
      deleteMessage: jest.fn().mockResolvedValue({ message_id: 7 }),
    };
    broadcastEmit = jest.fn();
    gateway = new ChatGateway(
      rooms as unknown as ChatRoomsService,
      messages as unknown as ChatMessagesService,
    );
    roomEmit = jest.fn();
    gateway.server = {
      to: jest.fn(() => ({ emit: roomEmit })),
    } as never;
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  // T96 (M6): joining the socket room needs an existing membership; it no longer creates one
  describe("join:room", () => {
    it("lets a member subscribe to the room without creating a membership", async () => {
      const socket = client(4);

      await gateway.handleJoinRoom(socket, 2);

      expect(rooms.assertIsMember).toHaveBeenCalledWith(2, 4);
      expect(rooms.joinRoom).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith("chat_2");
    });

    it("refuses a non-member", async () => {
      rooms.assertIsMember.mockRejectedValueOnce(new ForbiddenException());
      const socket = client(9);

      await gateway.handleJoinRoom(socket, 1);

      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Failed to join room",
      });
    });
  });

  // THESIS: T02, decision Q14 (M6): only the room creator invites
  describe("invite:room", () => {
    it("adds the invited user when the requester is the creator", async () => {
      await gateway.handleRoomInvite(client(2), { roomId: 2, userId: 1 });

      expect(rooms.assertIsCreator).toHaveBeenCalledWith(2, 2);
      expect(rooms.joinRoom).toHaveBeenCalledWith(2, 1);
    });

    it("refuses anyone but the creator and adds nobody", async () => {
      rooms.assertIsCreator.mockRejectedValueOnce(new ForbiddenException());
      const socket = client(4);

      await gateway.handleRoomInvite(socket, { roomId: 2, userId: 1 });

      expect(rooms.joinRoom).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Failed to invite user",
      });
    });
  });

  // M6 review: switching rooms in ChatView emits leave:room; it must not end the membership
  describe("leave:room", () => {
    it("only unsubscribes the socket and keeps the membership", () => {
      const socket = client(4, ["chat_2"]);

      gateway.handleLeaveRoom(socket, 2);

      expect(socket.leave).toHaveBeenCalledWith("chat_2");
      expect(rooms.leaveRoom).not.toHaveBeenCalled();
    });
  });

  // T96: editing and deleting need the owner who is still a member
  describe("chat:edit and chat:delete", () => {
    it("edits and deletes after the owner-and-member check", async () => {
      await gateway.handleChatEditMsg(client(4), {
        messageId: 7,
        message: "Neu",
      });
      await gateway.handleChatDeleteMsg(client(4), { messageId: 7 });

      expect(messages.assertCanModify).toHaveBeenCalledWith(7, 4);
      expect(messages.updateMsg).toHaveBeenCalledWith(7, "Neu");
      expect(messages.deleteMessage).toHaveBeenCalledWith(7);
    });

    it("refuses someone who isn't the owner or no longer a member", async () => {
      messages.assertCanModify.mockRejectedValue(new ForbiddenException());
      const socket = client(9);

      await gateway.handleChatEditMsg(socket, { messageId: 7, message: "x" });
      await gateway.handleChatDeleteMsg(socket, { messageId: 7 });

      expect(messages.updateMsg).not.toHaveBeenCalled();
      expect(messages.deleteMessage).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe("chat:typing", () => {
    it("relays typing only from a socket subscribed to the room", () => {
      gateway.handleChatTyping(client(9), { roomId: 2 });
      expect(broadcastEmit).not.toHaveBeenCalled();

      gateway.handleChatTyping(client(4, ["chat_2"]), { roomId: 2 });
      expect(broadcastEmit).toHaveBeenCalledWith("chat:typing", {
        userId: 4,
        username: "user4",
      });
    });
  });
});
