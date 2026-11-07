import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  Query,
} from "@nestjs/common";
import { TaskActivityLogService } from "./task-activity-log.service";
import { CreateTaskActivityLogDto } from "./dto/create-task-activity-log.dto";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionFlag } from "../permissions/permissions.service";

@ApiTags("task-activity")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("task-activity")
export class TaskActivityLogController {
  constructor(
    private readonly taskActivityLogService: TaskActivityLogService,
  ) {}

  @Post()
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  @ApiOperation({ summary: "Log a task activity" })
  @ApiResponse({ status: 201, description: "Activity logged successfully" })
  @ApiResponse({ status: 404, description: "Task not found" })
  create(
    @Body() createTaskActivityLogDto: CreateTaskActivityLogDto,
    @Req() req,
  ) {
    return this.taskActivityLogService.create(
      createTaskActivityLogDto,
      req.user.userId,
    );
  }

  @Get()
  @Permissions("view_dashboard")
  @ApiOperation({ summary: "Get all activity logs" })
  @ApiQuery({ name: "task_id", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Activity logs retrieved successfully",
  })
  findAll(@Query("task_id", ParseIntPipe) taskId: number) {
    return this.taskActivityLogService.findAll(taskId);
  }

  @Get(":id")
  @Permissions("view_dashboard")
  @ApiOperation({ summary: "Get activity log by ID" })
  @ApiResponse({
    status: 200,
    description: "Activity log retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Activity log not found" })
  findOne(@Param("log_id", ParseIntPipe) logId: number) {
    return this.taskActivityLogService.findOne(logId);
  }
}
