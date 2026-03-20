import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ChatRoomsService } from './chat-rooms.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard) 
@Controller('chat/rooms')
export class ChatRoomsController {
    constructor(private readonly chatRoomsService: ChatRoomsService) { }

    @Post()
    create(@Body() createChatRoomDto: CreateChatRoomDto, @Req() req) {
        return this.chatRoomsService.createRoom(createChatRoomDto, req.user.userId);
    }

    @Get()
    findRoomsByUser(@Req() req) {
        return this.chatRoomsService.findRoomsByUser(req.user.userId);
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

    @Patch(':id')
    updateRoom(@Param('id') id: string, @Body() updateChatRoomDto: UpdateChatRoomDto){
        return this.chatRoomsService.updateRoom(+id, updateChatRoomDto);
    }

    @Delete(':id')
    async deleteRoom(@Param('id') id: string, @Req() req){
        await this.chatRoomsService.assertIsCreator(+id, req.user.userId);
        return this.chatRoomsService.deleteRoom(+id);
    }

    @Post(':id/members')
    addMember(@Param('id') roomId: string, @Body('userId') newMember: string) {
        return this.chatRoomsService.joinRoom(+roomId, +newMember);
    }

    @Delete(':id/members/:userId')
    async removeMember(@Param('id') roomId: string, @Param('userId') targetUserId: string, @Req() req) {
        const requestUserId = req.user.userId;
        if(requestUserId !== +targetUserId) {
            await this.chatRoomsService.assertIsCreator(+roomId, requestUserId);
        }
        return this.chatRoomsService.leaveRoom(+roomId, +targetUserId);
    }
}
