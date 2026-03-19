import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ChatMessagesService } from "./chat-messages.service";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";
import { UpdateChatMessageDto } from "./dto/update-chat-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("chat/messages")
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) { }

  @Post()
  create(@Body() createChatMessageDto: CreateChatMessageDto) {
    return this.chatMessagesService.createMsg(createChatMessageDto);
  }

  @Get()
  findAll() {
    return this.chatMessagesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.chatMessagesService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateChatMessageDto: UpdateChatMessageDto,
  ) {
    if (!updateChatMessageDto.message) {
      throw new Error('Message is required');
    }
    return this.chatMessagesService.updateMsg(+id, updateChatMessageDto.message);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.chatMessagesService.deleteMessage(+id);
  }
}
