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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
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

  @Post()
  @Permissions("create_tasks", PermissionFlag.WRITE)
  create(@Body() dto: CreateTaskDto, @Req() req: AuthenticatedRequest) {
    return this.tasks.create(dto, req.user.userId);
  }

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

  @Post("templates")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  createTemplate(
    @Body() dto: CreateTaskTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.create(dto, req.user.userId);
  }

  @Get("templates")
  @Permissions("view_dashboard")
  findTemplates(@Req() req: AuthenticatedRequest) {
    return this.templates.findAll(req.user.userId);
  }

  @Get("templates/:templateId")
  @Permissions("view_dashboard")
  findTemplate(
    @Param("templateId", ParseIntPipe) templateId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.findOne(templateId, req.user.userId);
  }

  @Patch("templates/:templateId")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  updateTemplate(
    @Param("templateId", ParseIntPipe) templateId: number,
    @Body() dto: UpdateTaskTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.update(templateId, req.user.userId, dto);
  }

  @Delete("templates/:templateId")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  removeTemplate(
    @Param("templateId", ParseIntPipe) templateId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templates.remove(templateId, req.user.userId);
  }

  // ---- one task ----

  @Get(":id/tree")
  @Permissions("view_dashboard")
  findTree(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.findeOneWithSubtasks(id);
  }

  // feature #27: shows whether the task is locked for this student
  @Get(":id")
  @Permissions("view_dashboard")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.findOneForStudent(id, req.user.userId);
  }

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
  @Delete(":id")
  @Permissions("edit_tasks|delete_tasks")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.remove(id, req.user.userId);
  }

  @Post(":id/subtasks")
  @Permissions("create_tasks", PermissionFlag.WRITE)
  createSubTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.createSubTask(id, dto, req.user.userId);
  }

  @Get(":id/subtasks")
  @Permissions("view_dashboard")
  getSubtasks(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getSubtasksOfTask(id);
  }

  @Get(":id/documents")
  @Permissions("view_dashboard")
  getDocuments(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getDocuments(id);
  }

  @Get(":id/activity")
  @Permissions("view_dashboard")
  getActivity(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getActivityLog(id);
  }

  // ---- locking (feature #27, creator only) ----

  @Post(":id/lock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  lockTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.locking.lockTask(id, body.reason || "MANUAL", req.user.userId);
  }

  @Post(":id/unlock")
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  unlockTask(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.locking.unlockTask(id, req.user.userId);
  }

  @Get(":id/can-edit")
  @Permissions("view_dashboard")
  canEditTask(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.locking.canEditTask(id, req.user.userId);
  }

  // ---- comments (decision Q16, @mention mail T09) ----

  @Get(":id/comments")
  @Permissions("view_dashboard")
  getComments(@Param("id", ParseIntPipe) id: number) {
    return this.tasks.getComments(id);
  }

  @Post(":id/comments")
  @Permissions("view_dashboard")
  createComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.comments.create(id, req.user.userId, dto.content);
  }

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

  @Get(":id/grade-remarks")
  @Permissions("view_grades")
  getGradeRemarks(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.gradeRemarks.findForTask(id, req.user.userId);
  }

  // the same check as grading a document (PATCH /documents/:id/grade)
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
