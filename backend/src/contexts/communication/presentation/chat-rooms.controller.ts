import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ChatRealtime } from "../application/chat-realtime";
import { ChatRoomsService } from "../application/chat-rooms.service";
import { CreateChatRoomDto } from "./dto/create-chat-room.dto";
import { UpdateChatRoomDto } from "./dto/update-chat-room.dto";
import { AddChatMemberDto } from "./dto/add-chat-member.dto";
import { OpenDirectChatDto } from "./dto/open-direct-chat.dto";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../../shared/presentation/security";

@ApiTags("chat-rooms")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("chat-rooms")
export class ChatRoomsController {
  constructor(
    private readonly chatRoomsService: ChatRoomsService,
    private readonly chatRealtime: ChatRealtime,
  ) {}

  @ApiOperation({
    summary: "Create a group chat with the requester as creator",
  })
  @Post()
  @Permissions("view_dashboard")
  create(
    @Body() createChatRoomDto: CreateChatRoomDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatRoomsService.createRoom(createChatRoomDto, req.user.userId);
  }

  /** The one DM with this user, created on the first call (T113, M21). */
  @ApiOperation({
    summary:
      "The one DM with this user, created on the first call (T113, M21).",
  })
  @Post("direct")
  @Permissions("view_dashboard")
  openDirect(@Body() dto: OpenDirectChatDto, @Req() req: AuthenticatedRequest) {
    return this.chatRoomsService.openDirect(req.user.userId, dto.user_id);
  }

  /** The task's chat, created on the first call (T29, M21). */
  @ApiOperation({
    summary: "The task's chat, created on the first call (T29, M21).",
  })
  @Post("task/:taskId")
  @Permissions("view_dashboard")
  openTaskChat(
    @Param("taskId", ParseIntPipe) taskId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatRoomsService.openTaskChat(taskId, req.user.userId);
  }

  /** The class's chat, created on the first call (T29, decision D2, M21). */
  @ApiOperation({
    summary:
      "The class's chat, created on the first call (T29, decision D2, M21).",
  })
  @Post("class/:classId")
  @Permissions("view_dashboard")
  openClassChat(
    @Param("classId", ParseIntPipe) classId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatRoomsService.openClassChat(classId, req.user.userId);
  }

  @ApiOperation({ summary: "The requester's chat rooms (active memberships)" })
  @Get()
  @Permissions("view_dashboard")
  findRoomsByUser(@Req() req: AuthenticatedRequest) {
    return this.chatRoomsService.findRoomsByUser(req.user.userId);
  }

  @ApiOperation({ summary: "One chat room (members only)" })
  @Get(":id")
  @Permissions("view_dashboard")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.chatRoomsService.assertIsMember(id, req.user.userId);
    return this.chatRoomsService.findOne(id);
  }

  @ApiOperation({ summary: "Rename a chat room (creator only)" })
  @Patch(":id")
  @Permissions("view_dashboard")
  async updateRoom(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateChatRoomDto: UpdateChatRoomDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.chatRoomsService.assertIsCreator(id, req.user.userId);
    return this.chatRoomsService.updateRoom(id, updateChatRoomDto);
  }

  @ApiOperation({
    summary: "Delete a chat room with its messages (creator only)",
  })
  @Delete(":id")
  @Permissions("view_dashboard")
  deleteRoom(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    // deleteRoom checks the creator itself (also used by the socket delete:room)
    return this.chatRoomsService.deleteRoom(id, req.user.userId);
  }

  // decision Q14: only the creator adds members
  @ApiOperation({ summary: "Add a member (creator only)" })
  @Post(":id/members")
  @Permissions("view_dashboard")
  async addMember(
    @Param("id", ParseIntPipe) roomId: number,
    @Body() addChatMemberDto: AddChatMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.chatRoomsService.assertIsCreator(roomId, req.user.userId);
    const membership = await this.chatRoomsService.joinRoom(
      roomId,
      addChatMemberDto.userId,
    );
    // the added user gets the room live (open item (9) of M20)
    this.chatRealtime.subscribeUsersToRoom([addChatMemberDto.userId], roomId);
    return membership;
  }

  @ApiOperation({ summary: "Leave a room, or remove a member as its creator" })
  @Delete(":id/members/:userId")
  @Permissions("view_dashboard")
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
    this.chatRealtime.unsubscribeUserFromRoom(targetUserId, roomId);
    return membership;
  }
}
