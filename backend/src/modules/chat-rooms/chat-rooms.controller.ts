import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
} from '@nestjs/common';
import { ChatRoomsService } from './chat-rooms.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';

@Controller('chat-rooms')
export class ChatRoomsController {
    constructor(private readonly chatRoomsService: ChatRoomsService) { }

    @Post()
    create(@Body() createChatRoomDto: CreateChatRoomDto, @Body('userId') userId: number) {
        return this.chatRoomsService.createRoom(createChatRoomDto, userId);
    }

    @Get('user/:userId')
    findRoomsByUser(@Param('userId') userId: string) {
        return this.chatRoomsService.findRoomsByUser(+userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.chatRoomsService.findOne(+id);
    }

    @Post(':id')
    joinRoom(@Param('id') id: string, @Body('userId') userId: number) {
        return this.chatRoomsService.joinRoom(+id, userId);
    }

    @Delete(':id')
    leaveRoom(@Param('id') id: string, @Body('userId') userId: number) {
        return this.chatRoomsService.leaveRoom(+id, userId);
    }
}
