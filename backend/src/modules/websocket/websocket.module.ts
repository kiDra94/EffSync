import { Module, forwardRef } from "@nestjs/common";
import { WebsocketGateway } from "./websocket.gateway";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { jwtModuleOptions } from "../../config/auth.config";
import { WsJwtGuard } from "./ws-jwt.guard";
import { ChatMessagesModule } from "../chat-messages/chat-messages.module";
import { ChatRoomsModule } from "../chat-rooms/chat-rooms.module";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtModuleOptions,
    }),
    forwardRef(() => ChatMessagesModule),
    forwardRef(() => ChatRoomsModule),
  ],
  providers: [WebsocketGateway, WsJwtGuard],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
