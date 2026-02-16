import { Module } from '@nestjs/common';
import { ChatRoomUsersController } from './chat-room-users.controller';
import { ChatRoomUsersService } from './chat-room-users.service';

@Module({
  controllers: [ChatRoomUsersController],
  providers: [ChatRoomUsersService]
})
export class ChatRoomUsersModule {}
