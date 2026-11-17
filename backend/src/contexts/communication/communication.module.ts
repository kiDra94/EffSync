import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { ChatMessagesService } from "./application/chat-messages.service";
import { ChatRealtime } from "./application/chat-realtime";
import { ChatRoomsService } from "./application/chat-rooms.service";
import { ChatMessageRepository } from "./application/ports/chat-message.repository";
import { ChatRoomRepository } from "./application/ports/chat-room.repository";
import { CommunicationAccountDeletion } from "./infrastructure/communication-account-deletion";
import { PrismaChatMessageRepository } from "./infrastructure/persistence/prisma-chat-message.repository";
import { PrismaChatRoomRepository } from "./infrastructure/persistence/prisma-chat-room.repository";
import { ChatGateway } from "./presentation/chat.gateway";
import { ChatMessagesController } from "./presentation/chat-messages.controller";
import { ChatRoomsController } from "./presentation/chat-rooms.controller";

/**
 * communication (GOALS.md M20): chat rooms, memberships, messages and their
 * socket events. RealtimePublisher and the channel registry come from the
 * shared realtime transport, Notifier from the notifications port binding,
 * the account deletion registry from identity-access (all global).
 */
@Module({
  imports: [PrismaModule],
  controllers: [ChatRoomsController, ChatMessagesController],
  providers: [
    ChatRoomsService,
    ChatMessagesService,
    ChatRealtime,
    ChatGateway,
    CommunicationAccountDeletion,
    { provide: ChatRoomRepository, useClass: PrismaChatRoomRepository },
    { provide: ChatMessageRepository, useClass: PrismaChatMessageRepository },
  ],
})
export class CommunicationModule {}
