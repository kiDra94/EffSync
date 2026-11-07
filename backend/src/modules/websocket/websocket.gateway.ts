import { Logger, Inject, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatRoomsService } from "../chat-rooms/chat-rooms.service";
import { ChatMessagesService } from "../chat-messages/chat-messages.service";
import { PermissionsService } from "../../contexts/identity-access/application";

@WebSocketGateway({
  cors: {
    // checked per request (the decorator runs before .env is loaded) and only
    // the frontend's origin is allowed (T13)
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) =>
      callback(
        null,
        origin === (process.env.FRONTEND_URL || "http://localhost:5173"),
      ),
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatRoomsService: ChatRoomsService,
    @Inject(forwardRef(() => ChatMessagesService))
    private readonly chatMessagesService: ChatMessagesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  afterInit() {
    this.logger.log("WebSocket Gateway initialized!!!");
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: number; username: string }>(
        token,
      );

      // the socket is as protected as the chat REST routes (T54, decision F1)
      const userId = Number(payload.sub);
      if (
        !(await this.permissionsService.hasPermission(userId, "view_dashboard"))
      ) {
        this.logger.warn(
          `Connection refused: ${client.id} - no view_dashboard`,
        );
        client.disconnect();
        return;
      }

      client.data.user = {
        userId: payload.sub,
        username: payload.username,
      };
      client.join(`user_${payload.sub}`);

      const rooms = await this.chatRoomsService.findRoomsByUser(payload.sub);
      for (const room of rooms) {
        client.join(`chat_${room.room_id}`);
      }

      this.logger.log(`Client connected: ${client.id} - User ${payload.sub}`);
    } catch {
      this.logger.warn(`Connection refused: ${client.id} - invalid Token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id}: disconnected!`);
  }

  private userIdOf(client: Socket): number {
    return Number((client.data as { user?: { userId?: number } }).user?.userId);
  }

  emitTaskUpdated(userId: number, task: any) {
    this.server.to(`user_${userId}`).emit("task:updated", task);
  }

  emitToUser(userId: number, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(`chat_${room}`).emit(event, data);
  }

  @SubscribeMessage("join:room")
  async handleJoinRoom(client: Socket, roomId: number) {
    try {
      const userId = this.userIdOf(client);
      // subscribing needs an existing membership; members are added by the creator (T96, Q14)
      await this.chatRoomsService.assertIsMember(roomId, userId);
      client.join(`chat_${roomId}`);
      this.server
        .to(`chat_${roomId}`)
        .emit("room:user-joined", { userId, roomId });
      this.logger.log(`Client ${client.id} joined room ${roomId}`);
    } catch {
      this.logger.error(
        `join:room failed for client ${client.id} in room ${roomId}`,
      );
      client.emit("error", { message: "Failed to join room" });
    }
  }

  notifyUserNewRoom(userId: number, roomId: number) {
    this.server.to(`user_${userId}`).emit("room:new", { roomId });
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
        .to(`user_${payload.userId}`)
        .emit("room:new", { roomId: payload.roomId });
      this.logger.log(
        `User ${requesterId} invited ${payload.userId} to room ${payload.roomId}`,
      );
    } catch (error) {
      this.logger.error(`room:invite failed: ${error.message}`);
      client.emit("error", { message: "Failed to invite user" });
    }
  }

  // Unsubscribes this socket only (ChatView emits it when switching rooms).
  // Leaving a room for good is DELETE /chat-rooms/:id/members/:ownId.
  @SubscribeMessage("leave:room")
  handleLeaveRoom(client: Socket, roomId: number) {
    void client.leave(`chat_${roomId}`);
    this.logger.log(`Client ${client.id} unsubscribed from room ${roomId}`);
  }

  unsubscribeUserFromRoom(userId: number, roomId: number) {
    this.server.in(`user_${userId}`).socketsLeave(`chat_${roomId}`);
  }

  @SubscribeMessage("delete:room")
  async handleDeleteRoom(client: Socket, payload: { roomId: number }) {
    try {
      const userId = this.userIdOf(client);
      const roomId = Number(payload.roomId);
      await this.chatRoomsService.deleteRoom(roomId, userId);
      this.server.to(`chat_${roomId}`).emit("delete:room", { roomId });
      this.logger.log(`User ${userId} deleted room ${roomId}`);
    } catch (err) {
      this.logger.error(`delete:room failed: ${err.message}`);
      client.emit("error", { message: err.message || "Failed to delete room" });
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
      this.server.to(`chat_${payload.roomId}`).emit("chat:new", chatMessage);
      this.logger.log(`User ${userId} sent message in room ${payload.roomId}`);
    } catch (error) {
      this.logger.error(
        `chat:send failed for client ${client.id} in room ${payload.roomId}: ${error.message}`,
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
      this.server.to(`chat_${updated.room_id}`).emit("chat:edited", updated);
      this.logger.log(`User ${userId} edited message ${payload.messageId}}`);
    } catch (error) {
      this.logger.error(
        `chat:edit failed for client ${client.id}: ${error.message}`,
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
        .to(`chat_${msg.room_id}`)
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
      if (!userId || !data?.roomId || !client.rooms.has(`chat_${data.roomId}`))
        return;

      client.broadcast
        .to(`chat_${data.roomId}`)
        .emit("chat:typing", { userId, username });
    } catch (err) {
      this.logger.error(`chat:typing failed: ${err.message}`);
    }
  }

  /**
   * Feature #27: Emit task locked event to user
   * Called when a task is locked due to deadline
   */
  emitTaskLocked(userId: number, taskId: number, reason: string) {
    try {
      this.server.to(`user_${userId}`).emit("task:locked", {
        taskId,
        reason,
        timestamp: new Date(),
      });
      this.logger.log(
        `📡 Task locked event sent to user ${userId}: task ${taskId} - reason: ${reason}`,
      );
    } catch (err) {
      this.logger.error(`task:locked emit failed: ${err.message}`);
    }
  }

  /**
   * Feature #27: Broadcast notification to user
   * Called when a new notification is created
   */
  emitNotification(userId: number, notification: any) {
    try {
      this.server.to(`user_${userId}`).emit("notification:new", notification);
      this.logger.log(
        `📡 Notification sent to user ${userId}: ${notification.type}`,
      );
    } catch (err) {
      this.logger.error(`notification:new emit failed: ${err.message}`);
    }
  }
}
