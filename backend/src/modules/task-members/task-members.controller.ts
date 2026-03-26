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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskMembersService, TaskPermissionFlags } from './task-members.service';
import { CreateTaskMemberDto } from './dto/create-task-member.dto';
import { TaskMemberEntity } from './entities/task-member.entity';

/**
 * API-Endpoints für Task-Member-Verwaltung
 * 
 * Alle Endpoints erfordern Authentifizierung (JwtAuthGuard)
 */
@Controller('api/tasks/:taskId/members')
@UseGuards(JwtAuthGuard)
export class TaskMembersController {
  constructor(private readonly taskMembersService: TaskMembersService) {}

  /**
   * POST /api/tasks/:taskId/members
   * Fügt einen Benutzer zu einer Task hinzu.
   * 
   * Body: { "user_id": 123 }
   * Response: { task_id, user_id, joined_at, user: {...} }
   * 
   * Berechtigungen:
   * - Requester ist Task-Owner ODER
   * - Requester hat WRITE-Permission auf dieser Task
   */
  @Post()
  async addMember(
    @Param('taskId') taskId: string,
    @Body() createDto: CreateTaskMemberDto,
    @Req() req: any,
  ): Promise<TaskMemberEntity> {
    const taskIdNum = this.parseId(taskId);
    const userId = createDto.user_id;
    const currentUser = req.user;

    await this.taskMembersService.addMember(
      taskIdNum,
      userId,
      currentUser.id,
    );

    // Mit User-Details zurückgeben
    const member = await this.taskMembersService.findByTask(taskIdNum);
    const memberWithUser = member.find((m) => m.user_id === userId);

    if (!memberWithUser) {
      throw new BadRequestException('Mitglied konnte nicht gefunden werden');
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
   * Listet alle Mitglieder einer Task auf.
   * 
   * Response: [{ task_id, user_id, joined_at, user: {...} }, ...]
   * 
   * Berechtigungen:
   * - Requester ist Mitglied der Task ODER
   * - Requester hat READ-Permission auf dieser Task
   */
  @Get()
  async findMembers(
    @Param('taskId') taskId: string,
    @Req() req: any,
  ): Promise<TaskMemberEntity[]> {
    const taskIdNum = this.parseId(taskId);
    const currentUser = req.user;

    // Permission-Check: Ist Requester Mitglied oder hat read-Permission?
    const isMember = await this.taskMembersService.isMember(taskIdNum, currentUser.id);
    const hasReadPermission = await this.taskMembersService.checkPermission(
      currentUser.id,
      taskIdNum,
      TaskPermissionFlags.READ,
    );

    if (!isMember && !hasReadPermission) {
      throw new BadRequestException(
        'Sie haben keine Berechtigung, die Mitglieder zu sehen',
      );
    }

    const members = await this.taskMembersService.findByTask(taskIdNum);

    return members.map((m) => ({
      task_id: m.task_id,
      user_id: m.user_id,
      joined_at: m.joined_at,
      user: m.users as any,
    }));
  }

  /**
   * DELETE /api/tasks/:taskId/members/:userId
   * Entfernt einen Benutzer von einer Task.
   * 
   * Response: { success: true, message: "..." }
   * 
   * Berechtigungen:
   * - Requester ist Task-Owner ODER
   * - Requester hat WRITE-Permission auf dieser Task
   * 
   * Hindernis:
   * - Nicht den Task-Creator selbst entfernen
   * - Nicht den zugewiesenen Benutzer entfernen
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
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
   * Prüft, ob der aktuelle User eine bestimmte Permission hat.
   * 
   * Query Parameter:
   * - flag: 1 (EXECUTE), 2 (WRITE), 4 (READ) oder Kombination (6=RW, 7=RWX)
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
  @Get('check-permission')
  async checkPermission(
    @Param('taskId') taskId: string,
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
   * Hilfsfunktion: Parse String zu Nummer mit Validierung
   */
  private parseId(id: string): number {
    const parsed = parseInt(id, 10);

    if (isNaN(parsed) || parsed < 1) {
      throw new BadRequestException(`Invalid ID: ${id}`);
    }

    return parsed;
  }
}
