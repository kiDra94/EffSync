import { Module, forwardRef } from "@nestjs/common";
import { ChatRoomsService } from "./chat-rooms.service";
import { ChatRoomsController } from "./chat-rooms.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { WebsocketModule } from "../websocket/websocket.module";

@Module({
  imports: [PrismaModule, forwardRef(() => WebsocketModule)],
  controllers: [ChatRoomsController],
  providers: [ChatRoomsService],
  exports: [ChatRoomsService],
})
export class ChatRoomsModule {}
