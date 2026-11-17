import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { PermissionsService } from "../../../contexts/identity-access/application";
import { JwtRealtimeAuthenticator } from "../../../contexts/identity-access/infrastructure/jwt-realtime-authenticator";
import { ChatRealtime } from "../../../contexts/communication/application/chat-realtime";
import type { ChatRoomRepository } from "../../../contexts/communication/application/ports/chat-room.repository";
import {
  RealtimeChannelRegistry,
  type RealtimePublisher,
} from "../../application/realtime";
import { SocketIoRealtime } from "./socket-io-realtime";

// the shared Socket.io transport (M20; the connection tests were the
// WebsocketGateway's, M6 and M8), wired with the real authenticator and the
// chat's channel source
describe("SocketIoRealtime", () => {
  let realtime: SocketIoRealtime;
  let chat: ChatRealtime;
  let permissions: { hasPermission: jest.Mock };
  let jwt: { verify: jest.Mock };
  let rooms: { findActiveRoomIds: jest.Mock };
  let socketsLeave: jest.Mock;
  let serverIn: jest.Mock;
  let emit: jest.Mock;
  let serverTo: jest.Mock;

  beforeEach(() => {
    permissions = { hasPermission: jest.fn().mockResolvedValue(true) };
    jwt = { verify: jest.fn().mockReturnValue({ sub: 4, username: "felix" }) };
    rooms = { findActiveRoomIds: jest.fn().mockResolvedValue([2]) };
    const registry = new RealtimeChannelRegistry();
    realtime = new SocketIoRealtime(
      new JwtRealtimeAuthenticator(
        jwt as unknown as JwtService,
        permissions as unknown as PermissionsService,
      ),
      registry,
    );
    chat = new ChatRealtime(
      rooms as unknown as ChatRoomRepository,
      registry,
      realtime as RealtimePublisher,
    );
    chat.onModuleInit();
    socketsLeave = jest.fn();
    serverIn = jest.fn(() => ({ socketsLeave }));
    emit = jest.fn();
    serverTo = jest.fn(() => ({ emit }));
    realtime.server = { to: serverTo, in: serverIn } as never;
  });

  // T54 (M8 review): the socket is as protected as the chat REST routes (view_dashboard)
  describe("handleConnection", () => {
    const connecting = (auth: object = { token: "jwt" }) =>
      ({
        id: "socket-1",
        handshake: { auth },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      }) as unknown as Socket & { join: jest.Mock; disconnect: jest.Mock };

    it("joins the user's channel and rooms when the user has view_dashboard", async () => {
      const socket = connecting();

      await realtime.handleConnection(socket);

      expect(permissions.hasPermission).toHaveBeenCalledWith(
        4,
        "view_dashboard",
      );
      expect(socket.join).toHaveBeenCalledWith("user_4");
      expect(socket.join).toHaveBeenCalledWith("chat_2");
      expect((socket.data as { user?: unknown }).user).toEqual({
        userId: 4,
        username: "felix",
      });
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it("disconnects a user without view_dashboard before joining anything", async () => {
      permissions.hasPermission.mockResolvedValue(false);
      const socket = connecting();

      await realtime.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    });

    it("disconnects a socket without a token or with an invalid one", async () => {
      const withoutToken = connecting({});
      await realtime.handleConnection(withoutToken);
      expect(withoutToken.disconnect).toHaveBeenCalled();

      jwt.verify.mockImplementation(() => {
        throw new Error("invalid signature");
      });
      const invalid = connecting();
      await realtime.handleConnection(invalid);
      expect(invalid.disconnect).toHaveBeenCalled();
      expect(invalid.join).not.toHaveBeenCalled();
    });

    // review M20 (4): a failing channel lookup is logged as such and refused
    it("disconnects when the channels can't be read", async () => {
      rooms.findActiveRoomIds.mockRejectedValue(new Error("db down"));
      const socket = connecting();

      await realtime.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
    });
  });

  // review M20 (3): an emit error doesn't fail the use case that called it
  it("swallows and logs a failing emit", () => {
    realtime.server = undefined as never;

    expect(() => realtime.toUser(4, "task:locked", {})).not.toThrow();
  });

  it("unsubscribes all sockets of a removed member from the room", () => {
    chat.unsubscribeUserFromRoom(5, 2);

    expect(serverIn).toHaveBeenCalledWith("user_5");
    expect(socketsLeave).toHaveBeenCalledWith("chat_2");
  });

  // the event names stay the frontend's (M20 risk)
  it("publishes to a user's channel and to a named channel", () => {
    realtime.toUser(4, "notification:new", { id: 1 });
    realtime.toChannel("chat_2", "chat:new", { id: 2 });

    expect(serverTo).toHaveBeenNthCalledWith(1, "user_4");
    expect(emit).toHaveBeenNthCalledWith(1, "notification:new", { id: 1 });
    expect(serverTo).toHaveBeenNthCalledWith(2, "chat_2");
    expect(emit).toHaveBeenNthCalledWith(2, "chat:new", { id: 2 });
  });
});
