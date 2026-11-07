import { Module, forwardRef } from "@nestjs/common";
import { WebsocketGateway } from "./websocket.gateway";
import { WsJwtGuard } from "./ws-jwt.guard";
import { ChatMessagesModule } from "../chat-messages/chat-messages.module";
import { ChatRoomsModule } from "../chat-rooms/chat-rooms.module";

// JwtService comes from IdentityAccessModule (global, configured from JWT_SECRET)
@Module({
  imports: [
    forwardRef(() => ChatMessagesModule),
    forwardRef(() => ChatRoomsModule),
  ],
  providers: [WebsocketGateway, WsJwtGuard],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
