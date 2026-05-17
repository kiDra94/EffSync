import { Module, forwardRef } from "@nestjs/common";
import { ChatMessagesService } from "./chat-messages.service";
import { ChatMessagesController } from "./chat-messages.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule)],
  controllers: [ChatMessagesController],
  providers: [ChatMessagesService],
  exports: [ChatMessagesService]
})
export class ChatMessagesModule {}
