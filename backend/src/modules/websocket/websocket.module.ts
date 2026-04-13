import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from './ws-jwt.guard';
import { ChatMessagesModule } from '../chat-messages/chat-messages.module';
import { ChatRoomsModule } from '../chat-rooms/chat-rooms.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: {expiresIn: process.env.JWT_EXPIRATION || '1h'} as any,
      }),
    }),
    ChatMessagesModule,
    ChatRoomsModule,
  ],
  providers: [WebsocketGateway, WsJwtGuard],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
