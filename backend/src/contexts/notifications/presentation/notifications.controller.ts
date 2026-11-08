import { PermissionFlag } from "../../identity-access/application";
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { NotificationsService } from "../application/notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  // writes a notification for any user_id: system administration only (M8 review)
  @Permissions("manage_system", PermissionFlag.WRITE)
  @ApiOperation({ summary: "Create a notification (admin/system)" })
  @ApiResponse({
    status: 201,
    description: "Notification created successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  create(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.create(createDto);
  }

  @Get()
  @Permissions("view_dashboard")
  @ApiOperation({ summary: "Get all notifications for current user" })
  @ApiQuery({ name: "is_read", required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: "Notifications retrieved successfully",
  })
  findAll(@Req() req: AuthenticatedRequest, @Query("is_read") isRead?: string) {
    return this.notificationsService.findAll(
      req.user.userId,
      isRead !== undefined ? isRead === "true" : undefined,
    );
  }

  @Get("unread-count")
  @Permissions("view_dashboard")
  @ApiOperation({ summary: "Get unread notification count" })
  @ApiResponse({
    status: 200,
    description: "Unread count retrieved successfully",
  })
  getUnreadCount(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Get(":id")
  @Permissions("view_dashboard")
  @ApiOperation({ summary: "Get notification by ID" })
  @ApiResponse({
    status: 200,
    description: "Notification retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Notification not found" })
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.findOwn(id, req.user.userId);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  @Permissions("view_dashboard")
  markAsRead(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Patch("mark-all-read")
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 200, description: "All notifications marked as read" })
  @Permissions("view_dashboard")
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markManyAsRead(req.user.userId);
  }

  @Delete(":id")
  @Permissions("view_dashboard")
  @ApiOperation({ summary: "Delete notification" })
  @ApiResponse({
    status: 200,
    description: "Notification deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Notification not found" })
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.remove(id, req.user.userId);
  }
}
