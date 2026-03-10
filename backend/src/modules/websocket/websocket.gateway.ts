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
            if(!token) {
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
    handleJoinRoom(client: Socket, room: string) {
        client.join(`chat_${room}`);
        this.logger.log(`Client ${client.id} joined room ${room}`);
    }

    @SubscribeMessage('leave:room')
    handleLeaveRoom(client: Socket, room: string) {
        client.leave(`chat_${room}`);
        this.logger.log(`Client ${client.id} left room ${room}`);
    }

    async handleChatSendMsg(client: Socket, payload: { roomId: number, message: string }) {
        try {
            const userId = client.data.user?.userId;
            const isMember = await this.chatRoomsService.isUserInRoom(payload.roomId, userId);

            if(!isMember) {
                client.emit('error', { message: 'You are not a member of this room' });
                return;
            }

            const chatMessage = await this.chatMessagesService.createMessage({
                room_id: payload.roomId,
                user_id: userId,
                message: payload.message,
            });
            this.server.to(`chat_${payload.roomId}`).emit('chat:new', chatMessage);
            this.logger.log(`User ${userId} sent message in room ${payload.roomId}`);  
        } catch {
            this.logger.error(`Error handling chat message from client ${client.id} in room ${payload.roomId}`);
            client.emit('error', { message: 'Failed to send message' });
        }
    }
}
