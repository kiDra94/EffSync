import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../shared/presentation/security";
import { PermissionFlag } from "../../contexts/identity-access/application";
import {
  TaskMembersService,
  TaskPermissionFlags,
} from "./task-members.service";
import { CreateTaskMemberDto } from "./dto/create-task-member.dto";
import { TaskMemberEntity } from "./entities/task-member.entity";

/**
 * API endpoints for managing task members
 *
 * All endpoints require authentication (JwtAuthGuard)
 */
@Controller("api/tasks/:taskId/members")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskMembersController {
  constructor(private readonly taskMembersService: TaskMembersService) {}

  /**
   * POST /api/tasks/:taskId/members
   * Adds a user to a task.
   *
   * Body: { "user_id": 123 }
   * Response: { task_id, user_id, joined_at, user: {...} }
   *
   * Permissions:
   * - the requester is the task owner OR
   * - the requester has WRITE permission on this task
   */
  @Post()
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  async addMember(
    @Param("taskId") taskId: string,
    @Body() createDto: CreateTaskMemberDto,
    @Req() req: any,
  ): Promise<TaskMemberEntity> {
    const taskIdNum = this.parseId(taskId);
    const userId = createDto.user_id;
    const currentUser = req.user;

    await this.taskMembersService.addMember(taskIdNum, userId, currentUser.id);

    // Return it with the user details
    const member = await this.taskMembersService.findByTask(taskIdNum);
    const memberWithUser = member.find((m) => m.user_id === userId);

    if (!memberWithUser) {
      throw new BadRequestException("Mitglied konnte nicht gefunden werden");
    }

    return {
      task_id: memberWithUser.task_id,
      user_id: memberWithUser.user_id,
      joined_at: memberWithUser.joined_at,
      user: memberWithUser.users as any,
    };
  }

  /**
   * GET /api/tasks/:taskId/members
   * Lists all members of a task.
   *
   * Response: [{ task_id, user_id, joined_at, user: {...} }, ...]
   *
   * Permissions:
   * - the requester is a member of the task OR
   * - the requester has READ permission on this task
   */
  @Get()
  @Permissions("view_dashboard")
  async findMembers(
    @Param("taskId") taskId: string,
    @Req() req: any,
  ): Promise<TaskMemberEntity[]> {
    const taskIdNum = this.parseId(taskId);
    const currentUser = req.user;

    // Permission check: is the requester a member or has read permission?
    const isMember = await this.taskMembersService.isMember(
      taskIdNum,
      currentUser.id,
    );
    const hasReadPermission = await this.taskMembersService.checkPermission(
      currentUser.id,
      taskIdNum,
      TaskPermissionFlags.READ,
    );

    if (!isMember && !hasReadPermission) {
      throw new BadRequestException(
        "Sie haben keine Berechtigung, die Mitglieder zu sehen",
      );
    }

    const members =
      await this.taskMembersService.findByTaskIncludingImplicit(taskIdNum);

    return members.map((m) => ({
      task_id: m.task_id,
      user_id: m.user_id,
      joined_at: m.joined_at,
      user: m.users,
      role: m.role, // 'creator', 'assigned' or 'member'
    }));
  }

  /**
   * DELETE /api/tasks/:taskId/members/:userId
   * Removes a user from a task.
   *
   * Response: { success: true, message: "..." }
   *
   * Permissions:
   * - the requester is the task owner OR
   * - the requester has WRITE permission on this task
   *
   * Restrictions:
   * - the task creator can't be removed
   * - the assignee can't be removed
   */
  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions("edit_tasks", PermissionFlag.WRITE)
  async removeMember(
    @Param("taskId") taskId: string,
    @Param("userId") userId: string,
    @Req() req: any,
  ): Promise<void> {
    const taskIdNum = this.parseId(taskId);
    const userIdNum = this.parseId(userId);
    const currentUser = req.user;

    await this.taskMembersService.removeMember(
      taskIdNum,
      userIdNum,
      currentUser.id,
    );
  }

  /**
   * GET /api/tasks/:taskId/members/check-permission?flag=2
   * Checks whether the current user has a given permission.
   *
   * Query Parameter:
   * - flag: 1 (EXECUTE), 2 (WRITE), 4 (READ) or a combination (6=RW, 7=RWX)
   *
   * Response:
   * {
   *   "task_id": 42,
   *   "user_id": 123,
   *   "has_read": true,
   *   "has_write": true,
   *   "has_execute": false,
   *   "permission_flags": 6
   * }
   */
  @Get("check-permission")
  @Permissions("view_dashboard")
  async checkPermission(
    @Param("taskId") taskId: string,
    @Req() req: any,
  ): Promise<any> {
    const taskIdNum = this.parseId(taskId);
    const currentUser = req.user;

    const hasRead = await this.taskMembersService.checkPermission(
      currentUser.id,
      taskIdNum,
      TaskPermissionFlags.READ,
    );

    const hasWrite = await this.taskMembersService.checkPermission(
      currentUser.id,
      taskIdNum,
      TaskPermissionFlags.WRITE,
    );

    const hasExecute = await this.taskMembersService.checkPermission(
      currentUser.id,
      taskIdNum,
      TaskPermissionFlags.EXECUTE,
    );

    let flags = 0;
    if (hasRead) flags |= TaskPermissionFlags.READ;
    if (hasWrite) flags |= TaskPermissionFlags.WRITE;
    if (hasExecute) flags |= TaskPermissionFlags.EXECUTE;

    return {
      task_id: taskIdNum,
      user_id: currentUser.id,
      has_read: hasRead,
      has_write: hasWrite,
      has_execute: hasExecute,
      permission_flags: flags,
    };
  }

  /**
   * Helper: parses a string to a number, with validation
   */
  private parseId(id: string): number {
    const parsed = parseInt(id, 10);

    if (isNaN(parsed) || parsed < 1) {
      throw new BadRequestException(`Invalid ID: ${id}`);
    }

    return parsed;
  }
}
