import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { QueryTasksDto } from "./dto/query-tasks.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  @Permissions()
  create(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    return this.tasksService.create(createTaskDto, req.user.userId);
  }

  @Get()
  @Permissions()
  findAll(@Query() queryDto: QueryTasksDto) {
    return this.tasksService.findAll(queryDto);
  }

  @Get(":id/tree")
  @Permissions()
  findTree(@Param("id") id: string) {
    return this.tasksService.findeOneWithSubtasks(+id);
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id") id: string) {
    return this.tasksService.findOne(+id);
  }

  @Patch(":id")
  @Permissions("edit_tasks")
  update(@Param("id") id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(+id, updateTaskDto);
  }

  @Delete(":id")
  @Permissions("delete_tasks")
  remove(@Param("id") id: string) {
    return this.tasksService.remove(+id);
  }

  @Post(":id/subtasks")
  @Permissions("create_tasks")
  createSubTask(@Param("id") id: string, @Body() createTaskDto: CreateTaskDto, @Req() req) {
    return this.tasksService.createSubTask(+id, createTaskDto, req.user.userId);
  }

  @Get(":id/subtasks")
  @Permissions()
  getSubtasks(@Param("id") id: string) {
    return this.tasksService.getSubtasksOfTask(+id);
  }

  @Get(":id/comments")
  @Permissions()
  getComments(@Param("id") id: string) {
    return this.tasksService.getComments(+id);
  }

  @Get(":id/activity")
  @Permissions()
  getActivity(@Param("id") id: string) {
    return this.tasksService.getActivityLog(+id);
  }

  @Get(":id/documents")
  @Permissions()
  getDocuments(@Param("id") id: string) {
    return this.tasksService.getDocuments(+id);
  }

  /**
   * Feature #27: Lock a task (admin/creator only)
   * Prevents any modifications to the task
   */
  @Post(":id/lock")
  lockTask(
    @Param("id") id: string,
    @Body() { reason }: { reason?: string },
    @Req() req
  ) {
    return this.tasksService.lockTask(+id, reason || "MANUAL", req.user.userId);
  }

  /**
   * Feature #27: Unlock a task (admin/creator only)
   * Allows modifications again
   */
  @Post(":id/unlock")
  unlockTask(@Param("id") id: string, @Req() req) {
    return this.tasksService.unlockTask(+id, req.user.userId);
  }

  /**
   * Feature #27: Check if task can be edited
   */
  @Get(":id/can-edit")
  canEditTask(@Param("id") id: string, @Req() req) {
    return this.tasksService.canEditTask(+id, req.user.userId);
  }
}