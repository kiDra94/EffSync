import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  ParseIntPipe,
  forwardRef,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ChatRoomsService } from "./chat-rooms.service";
import { WebsocketGateway } from "../websocket/websocket.gateway";
import { CreateChatRoomDto } from "./dto/create-chat-room.dto";
import { UpdateChatRoomDto } from "./dto/update-chat-room.dto";
import { AddChatMemberDto } from "./dto/add-chat-member.dto";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("chat-rooms")
export class ChatRoomsController {
  constructor(
    private readonly chatRoomsService: ChatRoomsService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  @Post()
  @Permissions()
  create(
    @Body() createChatRoomDto: CreateChatRoomDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatRoomsService.createRoom(createChatRoomDto, req.user.userId);
  }

  @Get()
  @Permissions()
  findRoomsByUser(@Req() req: AuthenticatedRequest) {
    return this.chatRoomsService.findRoomsByUser(req.user.userId);
  }

  @Get(":id")
  @Permissions()
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.chatRoomsService.assertIsMember(id, req.user.userId);
    return this.chatRoomsService.findOne(id);
  }

  @Patch(":id")
  @Permissions()
  async updateRoom(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateChatRoomDto: UpdateChatRoomDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.chatRoomsService.assertIsCreator(id, req.user.userId);
    return this.chatRoomsService.updateRoom(id, updateChatRoomDto);
  }

  @Delete(":id")
  @Permissions()
  deleteRoom(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    // deleteRoom checks the creator itself (also used by the socket delete:room)
    return this.chatRoomsService.deleteRoom(id, req.user.userId);
  }

  // decision Q14: only the creator adds members
  @Post(":id/members")
  @Permissions()
  async addMember(
    @Param("id", ParseIntPipe) roomId: number,
    @Body() addChatMemberDto: AddChatMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.chatRoomsService.assertIsCreator(roomId, req.user.userId);
    return this.chatRoomsService.joinRoom(roomId, addChatMemberDto.userId);
  }

  @Delete(":id/members/:userId")
  @Permissions()
  async removeMember(
    @Param("id", ParseIntPipe) roomId: number,
    @Param("userId", ParseIntPipe) targetUserId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const requestUserId = req.user.userId;
    if (requestUserId !== targetUserId) {
      await this.chatRoomsService.assertIsCreator(roomId, requestUserId);
    }
    const membership = await this.chatRoomsService.leaveRoom(
      roomId,
      targetUserId,
    );
    // the removed user stops receiving the room's live messages
    this.websocketGateway.unsubscribeUserFromRoom(targetUserId, roomId);
    return membership;
  }
}
