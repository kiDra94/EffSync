import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatRoomsService } from '../chat-rooms/chat-rooms.service';
import { ChatMessagesService } from '../chat-messages/chat-messages.service';

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    }
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(WebsocketGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly chatRoomsService: ChatRoomsService,
        private readonly chatMessagesService: ChatMessagesService,
    ) { }

    afterInit() {
        this.logger.log('WebSocket Gateway initialized!!!')
    }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token;
            if (!token) {
                client.disconnect();
                return;
            };

            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });

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
        this.logger.log(`Client ${client.id}: disconnected!`)
    }

    emitTaskUpdated(userId: number, task: any) {
        this.server.to(`user_${userId}`).emit('task:updated', task);
    }

    emitToUsser(userId: number, event: string, data: any) {
        this.server.to(`user_${userId}`).emit(event, data);
    }

    emitToRoom(room: string, event: string, data: any) {
        this.server.to(`chat_${room}`).emit(event, data);
    }

    @SubscribeMessage('join:room')
    async handleJoinRoom(client: Socket, roomId: number) {
        try {
            const userId = client.data.user?.userId;
            await this.chatRoomsService.joinRoom(roomId, userId);
            client.join(`chat_${roomId}`);
            this.server.to(`chat_${roomId}`).emit('room:user-joined', { userId, roomId });
            this.logger.log(`Client ${client.id} joined room ${roomId}`);
        } catch {
            this.logger.error(`join:room failed for client ${client.id} in room ${roomId}`);
            client.emit('error', { message: 'Failed to join room' });
        }
    }

    notifyUserNewRoom(userId: number, roomId: number) {
        this.server.to(`user_${userId}`).emit('room:new', { roomId });
    }

    @SubscribeMessage('invite:room')
    async handleRoomInvite(client: Socket, payload: { roomId: number, userId: number }) {
        try {
            const requesterId = client.data.user?.userId;
            await this.chatRoomsService.joinRoom(payload.roomId, payload.userId);

            this.server.to(`user_${payload.userId}`).emit('room:new', { roomId: payload.roomId });
            this.logger.log(`User ${requesterId} invited ${payload.userId} to room ${payload.roomId}`);
        } catch (error) {
            this.logger.error(`room:invite failed: ${error.message}`);
            client.emit('error', { message: 'Failed to invite user' });
        }
    }

    @SubscribeMessage('leave:room')
    async handleLeaveRoom(client: Socket, roomId: number) {
        try {
            const userId = client.data.user?.userId;
            await this.chatRoomsService.leaveRoom(roomId, userId);
            client.leave(`chat_${roomId}`);
            this.server.to(`chat_${roomId}`).emit('room:user-left', { userId, roomId });
            this.logger.log(`Client ${client.id} left room ${roomId}`);
        } catch {
            this.logger.error(`leave:room failed for client ${client.id} in room ${roomId}`);
            client.emit('error', { message: 'Failed to leave room' });
        }
    }

    @SubscribeMessage('delete:room')
    async handleDeleteRoom(client: Socket, payload: { roomId: number }) {
        try {
            const userId = Number(client.data.user?.userId);
            const roomId = Number(payload.roomId);
            await this.chatRoomsService.deleteRoom(roomId, userId);
            this.server.to(`chat_${roomId}`).emit('room:deleted', { roomId });
            this.logger.log(`User ${userId} deleted room ${roomId}`);
        } catch (err) {
            this.logger.error(`room:delete failed: ${err.message}`);
            client.emit('error', { message: err.message || 'Failed to delete room' });
        }
    }

    @SubscribeMessage('chat:send')
    async handleChatSendMsg(client: Socket, payload: { roomId: number, message: string }) {
        try {
            const userId = client.data.user?.userId;
            const chatMessage = await this.chatMessagesService.createMsg({
                room_id: payload.roomId,
                user_id: userId,
                message: payload.message,
            });
            this.server.to(`chat_${payload.roomId}`).emit('chat:new', chatMessage);
            this.logger.log(`User ${userId} sent message in room ${payload.roomId}`);
        } catch (error) {
            this.logger.error(`chat:send failed for client ${client.id} in room ${payload.roomId}: ${error.message}`);
            client.emit('error', { message: 'Failed to send message' });
        }
    }

    @SubscribeMessage('chat:edit')
    async handleChatEditMsg(client: Socket, payload: { messageId: number, message: string }) {
        try {
            const userId = client.data.user?.userId;
            const messageId = Number(payload.messageId);
            const isOwner = await this.chatMessagesService.isMsgOwner(messageId, userId);

            if (!isOwner) {
                client.emit('error', { message: 'You can only edit your own messages!' });
                return;
            }

            const updated = await this.chatMessagesService.updateMsg(
                messageId,
                payload.message,
            );
            this.server.to(`chat_${updated.room_id}`).emit('chat:edited', updated);
            this.logger.log(`User ${userId} edited message ${payload.messageId}}`);
        } catch (error) {
            this.logger.error(`chat:edit failed for client ${client.id}: ${error.message}`);
            client.emit('error', { message: 'Failed to edit message!' });
        }
    }

    @SubscribeMessage('chat:delete')
    async handleChatDeleteMsg(client: Socket, payload: { messageId: number }) {
        try {
            const userId = client.data.user?.userId;

            if (!userId) {
                client.emit('error', { message: 'You can only delete your own messages!' });
                return;
            }

            const msg = await this.chatMessagesService.findOne(payload.messageId);
            if (!msg) {
                client.emit('error', { message: 'Message not found!' });
                return;
            }

            const deleted = await this.chatMessagesService.deleteMessage(payload.messageId);
            this.server.to(`chat_${msg.room_id}`).emit('chat:deleted', { messageId: payload.messageId });
            this.logger.log(`User ${userId} deleted message ${payload.messageId}`);
        } catch {
            this.logger.error(`Error handling chat:delete failed for client ${client.id}`);
            client.emit('error', { message: 'Failed to edit message!' });
        }
    }

    @SubscribeMessage('chat:typing')
    handleChatTyping(client: Socket, data: { roomId: number }) {
        try {
            const userId = client.data.user?.userId;
            const username = client.data.user?.username;

            if (!userId || !data?.roomId) return;

            client.broadcast
                .to(`chat_${data.roomId}`)
                .emit('chat:typing', { userId, username });
        } catch (err) {
            this.logger.error(`chat:typing failed: ${err.message}`);
        }
    }
}
