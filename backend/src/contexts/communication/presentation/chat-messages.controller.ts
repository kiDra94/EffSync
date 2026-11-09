import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Req,
} from "@nestjs/common";
import { ChatMessagesService } from "../application/chat-messages.service";
import { CreateChatMessageDto } from "./dto/create-chat-message.dto";
import { UpdateChatMessageDto } from "./dto/update-chat-message.dto";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../../shared/presentation/security";

@ApiTags("chat-messages")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("chat-rooms")
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @ApiOperation({ summary: "Send a message to a room (members only)" })
  @Post(":id/messages")
  @Permissions("view_dashboard")
  create(
    @Param("id", ParseIntPipe) roomId: number,
    @Body() body: Partial<CreateChatMessageDto> & { content?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const message = body?.message ?? body?.content;
    if (!message) {
      throw new BadRequestException("Message is required");
    }

    return this.chatMessagesService.createMsg({
      room_id: roomId,
      user_id: req.user.userId,
      message,
      file_path: body?.file_path,
    });
  }

  @ApiOperation({ summary: "A room's messages, oldest first (members only)" })
  @Get(":id/messages")
  @Permissions("view_dashboard")
  getMessages(
    @Param("id", ParseIntPipe) roomId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatMessagesService.findByRoom(roomId, req.user.userId);
  }

  @ApiOperation({ summary: "Edit an own message" })
  @Patch("messages/:id")
  @Permissions("view_dashboard")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateChatMessageDto: UpdateChatMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!updateChatMessageDto.message) {
      // BUG (kept from before M20, M21): a plain error, so the answer is 500
      throw new Error("Message is required");
    }
    await this.chatMessagesService.assertCanModify(id, req.user.userId);
    return this.chatMessagesService.updateMsg(id, updateChatMessageDto.message);
  }

  @ApiOperation({ summary: "Delete an own message" })
  @Delete("messages/:id")
  @Permissions("view_dashboard")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.chatMessagesService.assertCanModify(id, req.user.userId);
    return this.chatMessagesService.deleteMessage(id);
  }
}
