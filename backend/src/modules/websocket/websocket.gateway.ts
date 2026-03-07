import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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

    constructor(private readonly jwtService: JwtService) { }

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
}
