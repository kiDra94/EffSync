import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  Req,
} from "@nestjs/common";
import { ChatMessagesService } from "./chat-messages.service";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";
import { UpdateChatMessageDto } from "./dto/update-chat-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("chat")
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) { }

  @Post('rooms/:id/messages')
  @Permissions()
  create(@Body() createChatMessageDto: CreateChatMessageDto) {
    return this.chatMessagesService.createMsg(createChatMessageDto);
  }

  @Get()
  @Permissions()
  findAll() {
    return this.chatMessagesService.findAll();
  }

  @Get('rooms/:id/messages')
  @Permissions()
  getMessages(@Param('id') roomId: number) {
    return this.chatMessagesService.findByRoom(+roomId);
  }

  @Patch('messages/:id')
  @Permissions()
  async update(
    @Param("id") id: string,
    @Body() updateChatMessageDto: UpdateChatMessageDto,
    @Req() req
  ) {
    if (!updateChatMessageDto.message) {
      throw new Error('Message is required');
    }
    const isOwner = await this.chatMessagesService.isMsgOwner(+id, req.user.userId);
    if (!isOwner) throw new ForbiddenException('Not your message!');
    return this.chatMessagesService.updateMsg(+id, updateChatMessageDto.message);
  }

  @Delete('messages/:id')
  @Permissions()
  async remove(@Param("id") id: string, @Req() req) {
    const isOwner = await this.chatMessagesService.isMsgOwner(+id, req.user.userId);
    if (!isOwner) throw new ForbiddenException('Not your message!')
    return this.chatMessagesService.deleteMessage(+id);
  }
}
