import { Logger } from "@nestjs/common";
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import {
  REALTIME_GATEWAY_OPTIONS,
  userChannel,
} from "../../../shared/application/realtime";
import { roomChannel } from "../domain/chat-notification";
import { ChatMessagesService } from "../application/chat-messages.service";
import { ChatRoomsService } from "../application/chat-rooms.service";

const reason = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * The chat's socket events (M20, until then in modules/websocket). The
 * connection, its token check and the channel joins are the shared
 * realtime transport's; this gateway shares its server.
 */
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatRoomsService: ChatRoomsService,
    private readonly chatMessagesService: ChatMessagesService,
  ) {}

  private userIdOf(client: Socket): number {
    return Number((client.data as { user?: { userId?: number } }).user?.userId);
  }

  @SubscribeMessage("join:room")
  async handleJoinRoom(client: Socket, roomId: number) {
    try {
      const userId = this.userIdOf(client);
      // subscribing needs an existing membership; members are added by the creator (T96, Q14)
      await this.chatRoomsService.assertIsMember(roomId, userId);
      void client.join(roomChannel(roomId));
      this.server
        .to(roomChannel(roomId))
        .emit("room:user-joined", { userId, roomId });
      this.logger.log(`Client ${client.id} joined room ${roomId}`);
    } catch {
      this.logger.error(
        `join:room failed for client ${client.id} in room ${roomId}`,
      );
      client.emit("error", { message: "Failed to join room" });
    }
  }

  @SubscribeMessage("invite:room")
  async handleRoomInvite(
    client: Socket,
    payload: { roomId: number; userId: number },
  ) {
    try {
      const requesterId = this.userIdOf(client);
      await this.chatRoomsService.assertIsCreator(payload.roomId, requesterId);
      await this.chatRoomsService.joinRoom(payload.roomId, payload.userId);

      this.server
        .to(userChannel(payload.userId))
        .emit("room:new", { roomId: payload.roomId });
      this.logger.log(
        `User ${requesterId} invited ${payload.userId} to room ${payload.roomId}`,
      );
    } catch (error) {
      this.logger.error(`room:invite failed: ${reason(error)}`);
      client.emit("error", { message: "Failed to invite user" });
    }
  }

  // Unsubscribes this socket only (ChatView emits it when switching rooms).
  // Leaving a room for good is DELETE /chat-rooms/:id/members/:ownId.
  @SubscribeMessage("leave:room")
  handleLeaveRoom(client: Socket, roomId: number) {
    void client.leave(roomChannel(roomId));
    this.logger.log(`Client ${client.id} unsubscribed from room ${roomId}`);
  }

  @SubscribeMessage("delete:room")
  async handleDeleteRoom(client: Socket, payload: { roomId: number }) {
    try {
      const userId = this.userIdOf(client);
      const roomId = Number(payload.roomId);
      await this.chatRoomsService.deleteRoom(roomId, userId);
      this.server.to(roomChannel(roomId)).emit("delete:room", { roomId });
      this.logger.log(`User ${userId} deleted room ${roomId}`);
    } catch (error) {
      this.logger.error(`delete:room failed: ${reason(error)}`);
      client.emit("error", {
        message: reason(error) || "Failed to delete room",
      });
    }
  }

  @SubscribeMessage("chat:send")
  async handleChatSendMsg(
    client: Socket,
    payload: { roomId: number; message: string },
  ) {
    try {
      const userId = this.userIdOf(client);
      const chatMessage = await this.chatMessagesService.createMsg({
        room_id: payload.roomId,
        user_id: userId,
        message: payload.message,
      });
      this.server.to(roomChannel(payload.roomId)).emit("chat:new", chatMessage);
      this.logger.log(`User ${userId} sent message in room ${payload.roomId}`);
    } catch (error) {
      this.logger.error(
        `chat:send failed for client ${client.id} in room ${payload.roomId}: ${reason(error)}`,
      );
      client.emit("error", { message: "Failed to send message" });
    }
  }

  @SubscribeMessage("chat:edit")
  async handleChatEditMsg(
    client: Socket,
    payload: { messageId: number; message: string },
  ) {
    try {
      const userId = this.userIdOf(client);
      const messageId = Number(payload.messageId);
      await this.chatMessagesService.assertCanModify(messageId, userId);

      const updated = await this.chatMessagesService.updateMsg(
        messageId,
        payload.message,
      );
      this.server.to(roomChannel(updated.room_id)).emit("chat:edited", updated);
      this.logger.log(`User ${userId} edited message ${payload.messageId}`);
    } catch (error) {
      this.logger.error(
        `chat:edit failed for client ${client.id}: ${reason(error)}`,
      );
      client.emit("error", { message: "Failed to edit message!" });
    }
  }

  @SubscribeMessage("chat:delete")
  async handleChatDeleteMsg(client: Socket, payload: { messageId: number }) {
    try {
      const userId = this.userIdOf(client);
      const msg = await this.chatMessagesService.assertCanModify(
        Number(payload.messageId),
        userId,
      );

      await this.chatMessagesService.deleteMessage(msg.message_id);
      this.server
        .to(roomChannel(msg.room_id))
        .emit("chat:deleted", { messageId: payload.messageId });
      this.logger.log(`User ${userId} deleted message ${payload.messageId}`);
    } catch {
      this.logger.error(
        `Error handling chat:delete failed for client ${client.id}`,
      );
      client.emit("error", { message: "Failed to delete message!" });
    }
  }

  @SubscribeMessage("chat:typing")
  handleChatTyping(client: Socket, data: { roomId: number }) {
    try {
      const userId = this.userIdOf(client);
      const username = (client.data as { user?: { username?: string } }).user
        ?.username;

      // only a socket subscribed to the room (a member, see join:room) may signal typing
      if (
        !userId ||
        !data?.roomId ||
        !client.rooms.has(roomChannel(data.roomId))
      )
        return;

      client.broadcast
        .to(roomChannel(data.roomId))
        .emit("chat:typing", { userId, username });
    } catch (error) {
      this.logger.error(`chat:typing failed: ${reason(error)}`);
    }
  }
}
