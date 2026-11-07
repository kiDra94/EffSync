import { PermissionFlag } from "../../contexts/identity-access/application";
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
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
  RolesGuard,
} from "../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../shared/presentation/security";
import { QueryTasksDto } from "./dto/query-tasks.dto";

// check order token → role → permission (T97)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Permissions("create_tasks", PermissionFlag.WRITE)
  create(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    return this.tasksService.create(createTaskDto, req.user.userId);
  }

  @Get()
  @Permissions("view_dashboard")
  findAll(@Query() queryDto: QueryTasksDto, @Req() req) {
    return this.tasksService.findAll(queryDto, req.user.userId);
  }

  @Get(":id/tree")
  @Permissions("view_dashboard")
  findTree(@Param("id") id: string) {
    return this.tasksService.findeOneWithSubtasks(+id);
  }

  @Get(":id")
  @Permissions("view_dashboard")
  findOne(@Param("id") id: string, @Req() req) {
    // Feature #27: use the per-student method to show whether only this student is locked
    return this.tasksService.findOneForStudent(+id, req.user.userId);
  }

  @Patch(":id")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  update(
    @Param("id") id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    return this.tasksService.update(+id, updateTaskDto, req.user.userId);
  }

  /**
   * PATCH /tasks/:id/deadline-unlock
   * Updates the deadline and unlocks a task after grading
   * Only teachers may use this action
   */
  // staff or the task's creator; checked in the service, because a role alone isn't enough
  @Patch(":id/deadline-unlock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  updateDeadlineAndUnlock(
    @Param("id") id: string,
    @Body() body: { deadline: string | Date },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!body.deadline) {
      throw new Error("deadline erforderlich im Body");
    }
    return this.tasksService.updateDeadlineAndUnlockIfNeeded(
      +id,
      new Date(body.deadline),
      req.user.userId,
    );
  }

  // own tasks with edit_tasks, others' with delete_tasks (checked in the service)
  @Delete(":id")
  @Permissions("edit_tasks|delete_tasks")
  remove(@Param("id") id: string, @Req() req) {
    const requesterId = req?.user?.userId ?? req?.user?.id;
    return this.tasksService.remove(+id, requesterId);
  }

  @Post(":id/subtasks")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  createSubTask(
    @Param("id") id: string,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req,
  ) {
    return this.tasksService.createSubTask(+id, createTaskDto, req.user.userId);
  }

  @Get(":id/subtasks")
  @Permissions("view_dashboard")
  getSubtasks(@Param("id") id: string) {
    return this.tasksService.getSubtasksOfTask(+id);
  }

  @Get(":id/comments")
  @Permissions("view_dashboard")
  getComments(@Param("id") id: string) {
    return this.tasksService.getComments(+id);
  }

  @Get(":id/activity")
  @Permissions("view_dashboard")
  getActivity(@Param("id") id: string) {
    return this.tasksService.getActivityLog(+id);
  }

  @Get(":id/documents")
  @Permissions("view_dashboard")
  getDocuments(@Param("id") id: string) {
    return this.tasksService.getDocuments(+id);
  }

  /**
   * Feature #27: Lock a task (admin/creator only)
   * Prevents any modifications to the task
   */
  @Post(":id/lock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  lockTask(
    @Param("id") id: string,
    @Body() { reason }: { reason?: string },
    @Req() req,
  ) {
    return this.tasksService.lockTask(+id, reason || "MANUAL", req.user.userId);
  }

  /**
   * Feature #27: Unlock a task (admin/creator only)
   * Allows modifications again
   */
  @Post(":id/unlock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  unlockTask(@Param("id") id: string, @Req() req) {
    return this.tasksService.unlockTask(+id, req.user.userId);
  }

  /**
   * Feature #27: Check if task can be edited
   */
  @Get(":id/can-edit")
  @Permissions("view_dashboard")
  canEditTask(@Param("id") id: string, @Req() req) {
    return this.tasksService.canEditTask(+id, req.user.userId);
  }
}
