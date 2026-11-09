import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import {
  PermissionFlag,
  PRIVILEGED_ROLES,
  STAFF_ROLES,
} from "../../identity-access/application";
import {
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import { TaskActivityLogService } from "../application/activity-log.service";
import { CommentsService } from "../application/comments.service";
import { GradeRemarksService } from "../application/grade-remarks.service";
import { TaskLockingService } from "../application/task-locking.service";
import { TaskMembersService } from "../application/task-members.service";
import { TaskTemplatesService } from "../application/task-templates.service";
import { TaskService } from "../application/task.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { CommentDto } from "./dto/comment.dto";
import { CreateTaskMemberDto } from "./dto/create-task-member.dto";
import { CreateTaskTemplateDto } from "./dto/create-task-template.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { GradeRemarkDto } from "./dto/grade-remark.dto";
import { QueryTasksDto } from "./dto/query-tasks.dto";
import { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TaskVisibilityGuard } from "./task-visibility.guard";

/**
 * The single HTTP entry point for task operations (decision Q6). The static
 * routes /tasks/activity and /tasks/templates come before /tasks/:id.
 * Check order token → role → permission (T97).
 */
@ApiTags("tasks")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TaskVisibilityGuard)
@Controller("tasks")
export class TaskController {
  constructor(
    private readonly tasks: TaskService,
    private readonly locking: TaskLockingService,
    private readonly activity: TaskActivityLogService,
    private readonly templates: TaskTemplatesService,
    private readonly members: TaskMembersService,
    private readonly comments: CommentsService,
    private readonly gradeRemarks: GradeRemarksService,
  ) {}

  @ApiOperation({
    summary: "Create a task (the requester is creator and member)",
  })
  @Post()
  @Permissions("create_tasks", PermissionFlag.WRITE)
  create(@Body() dto: CreateTaskDto, @Req() req: AuthenticatedRequest) {
    return this.tasks.create(dto, req.user.userId);
  }

  @ApiOperation({
    summary: "List the visible tasks with filters, sorting and paging",
  })
  @Get()
  @Permissions("view_dashboard")
  findAll(@Query() query: QueryTasksDto, @Req() req: AuthenticatedRequest) {
    return this.tasks.findAll(query, req.user.userId);
  }

  // ---- audit log (T33, UC-32, decision A2) ----

  @Get("activity")
  @Roles(...PRIVILEGED_ROLES)
  @Permissions("manage_system", PermissionFlag.READ)
  @ApiOperation({ summary: "Audit log of all tasks, deleted ones included" })
  findAllActivity(@Query() query: AuditLogQueryDto) {
    return this.activity.findAll({
      userId: query.user_id,
      action: query.action,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });
  }

  // ---- templates (T110): name and description (H2), private (E1) ----

  @ApiOperation({ summary: "Save a private task template" })
  @Post("templates")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  createTemplate(
    @Body() dto: CreateTaskTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.create(dto, req.user.userId);
  }

  @ApiOperation({ summary: "The requester's task templates" })
  @Get("templates")
  @Permissions("view_dashboard")
  findTemplates(@Req() req: AuthenticatedRequest) {
    return this.templates.findAll(req.user.userId);
  }

  @ApiOperation({ summary: "One own template with the tasks created from it" })
  @Get("templates/:templateId")
  @Permissions("view_dashboard")
  findTemplate(
    @Param("templateId", ParseIntPipe) templateId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.findOne(templateId, req.user.userId);
  }

  @ApiOperation({ summary: "Change an own template" })
  @Patch("templates/:templateId")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  updateTemplate(
    @Param("templateId", ParseIntPipe) templateId: number,
    @Body() dto: UpdateTaskTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.update(templateId, req.user.userId, dto);
  }

  @ApiOperation({ summary: "Delete an own template (its tasks stay)" })
  @Delete("templates/:templateId")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  removeTemplate(
    @Param("templateId", ParseIntPipe) templateId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.remove(templateId, req.user.userId);
  }

  // ---- one task ----

  @ApiOperation({ summary: "A task with all its subtasks as a tree" })
  @Get(":id/tree")
  @Permissions("view_dashboard")
  findTree(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.findeOneWithSubtasks(id);
  }

  // feature #27: shows whether the task is locked for this student
  @ApiOperation({ summary: "One visible task" })
  @Get(":id")
  @Permissions("view_dashboard")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.findOneForStudent(id, req.user.userId);
  }

  @ApiOperation({
    summary: "Change a task (status, progress, rules, tags, parent)",
  })
  @Patch(":id")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.update(id, dto, req.user.userId);
  }

  // staff or the task's creator; checked in the service, because a role alone isn't enough
  @ApiOperation({ summary: "Set a new deadline and unlock the task" })
  @Patch(":id/deadline-unlock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  updateDeadlineAndUnlock(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { deadline?: string | Date },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!body.deadline) {
      throw new BadRequestException("deadline erforderlich im Body");
    }
    return this.locking.updateDeadlineAndUnlockIfNeeded(
      id,
      new Date(body.deadline),
      req.user.userId,
    );
  }

  // own tasks with edit_tasks, others' with delete_tasks (checked in the service)
  @ApiOperation({
    summary: "Delete a task without subtasks (creator or delete_tasks)",
  })
  @Delete(":id")
  @Permissions("edit_tasks|delete_tasks")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.remove(id, req.user.userId);
  }

  @ApiOperation({ summary: "Create a subtask" })
  @Post(":id/subtasks")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  createSubTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.createSubTask(id, dto, req.user.userId);
  }

  @ApiOperation({ summary: "A task's direct subtasks" })
  @Get(":id/subtasks")
  @Permissions("view_dashboard")
  getSubtasks(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getSubtasksOfTask(id);
  }

  @ApiOperation({ summary: "The documents linked to a task" })
  @Get(":id/documents")
  @Permissions("view_dashboard")
  getDocuments(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getDocuments(id);
  }

  @ApiOperation({ summary: "A task's activity log" })
  @Get(":id/activity")
  @Permissions("view_dashboard")
  getActivity(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getActivityLog(id);
  }

  // ---- locking (feature #27, creator only) ----

  @ApiOperation({ summary: "Lock a task (creator only)" })
  @Post(":id/lock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  lockTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.locking.lockTask(id, body.reason || "MANUAL", req.user.userId);
  }

  @ApiOperation({ summary: "Unlock a task (creator only)" })
  @Post(":id/unlock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  unlockTask(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.locking.unlockTask(id, req.user.userId);
  }

  @ApiOperation({ summary: "Whether the requester may edit the task" })
  @Get(":id/can-edit")
  @Permissions("view_dashboard")
  canEditTask(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.locking.canEditTask(id, req.user.userId);
  }

  // ---- comments (decision Q16, @mention mail T09) ----

  @ApiOperation({ summary: "A task's comments, oldest first" })
  @Get(":id/comments")
  @Permissions("view_dashboard")
  getComments(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getComments(id);
  }

  @ApiOperation({ summary: "Comment on a task (@mentions are mailed)" })
  @Post(":id/comments")
  @Permissions("view_dashboard")
  createComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.comments.create(id, req.user.userId, dto.content);
  }

  @ApiOperation({ summary: "Edit an own comment" })
  @Patch(":id/comments/:commentId")
  @Permissions("view_dashboard")
  updateComment(
    @Param("id", ParseIntPipe) id: number,
    @Param("commentId", ParseIntPipe) commentId: number,
    @Body() dto: CommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.comments.update(id, commentId, req.user.userId, dto.content);
  }

  @ApiOperation({ summary: "Delete an own comment" })
  @Delete(":id/comments/:commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions("view_dashboard")
  async removeComment(
    @Param("id", ParseIntPipe) id: number,
    @Param("commentId", ParseIntPipe) commentId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.comments.remove(id, commentId, req.user.userId);
  }

  // ---- grading remarks (decision Q16) ----

  @ApiOperation({ summary: "A task's grading remarks" })
  @Get(":id/grade-remarks")
  @Permissions("view_grades")
  getGradeRemarks(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.gradeRemarks.findForTask(id, req.user.userId);
  }

  // the same check as grading a document (PATCH /documents/:id/grade)
  @ApiOperation({ summary: "Add a grading remark (staff)" })
  @Post(":id/grade-remarks")
  @Roles(...STAFF_ROLES)
  @Permissions("edit_grades", PermissionFlag.WRITE)
  createGradeRemark(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: GradeRemarkDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.gradeRemarks.create(id, req.user.userId, dto.text);
  }

  // ---- members (T44; formerly /api/api/tasks/:taskId/members, T130) ----

  @ApiOperation({ summary: "Add a task member" })
  @Post(":id/members")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  async addMember(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateTaskMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.members.addMember(id, dto.user_id, req.user.userId);
    const added = (await this.members.findByTask(id)).find(
      (m) => m.user_id === dto.user_id,
    );
    if (!added) {
      throw new BadRequestException("Mitglied konnte nicht gefunden werden");
    }
    return {
      task_id: added.task_id,
      user_id: added.user_id,
      joined_at: added.joined_at,
      user: added.users,
    };
  }

  // members, or users with READ on the task (403 otherwise)
  @ApiOperation({ summary: "A task's members" })
  @Get(":id/members")
  @Permissions("view_dashboard")
  async findMembers(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return (await this.members.findMembersFor(id, req.user.userId)).map(
      (m) => ({
        task_id: m.task_id,
        user_id: m.user_id,
        joined_at: m.joined_at,
        user: m.users,
        role: m.role,
      }),
    );
  }

  // the requester's rwx flags on the task
  @ApiOperation({ summary: "Whether the requester may manage the members" })
  @Get(":id/members/check-permission")
  @Permissions("view_dashboard")
  async checkMemberPermission(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      task_id: id,
      user_id: req.user.userId,
      ...(await this.members.permissionFlags(req.user.userId, id)),
    };
  }

  // the creator and the assignee can't be removed
  @ApiOperation({ summary: "Remove a task member" })
  @Delete(":id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  async removeMember(
    @Param("id", ParseIntPipe) id: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.members.removeMember(id, userId, req.user.userId);
  }
}
