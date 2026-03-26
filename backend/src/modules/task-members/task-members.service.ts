import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskMemberDto } from './dto/create-task-member.dto';

/**
 * Permission-Flags (bitweise):
 * READ:    0b100 = 4   (Daten lesen)
 * WRITE:   0b010 = 2   (Daten ändern)
 * EXECUTE: 0b001 = 1   (Aktion ausführen)
 * RWX:     0b111 = 7   (Vollzugriff)
 */
export const TaskPermissionFlags = {
  READ: 4,
  WRITE: 2,
  EXECUTE: 1,
  RWX: 7,
};

@Injectable()
export class TaskMembersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fügt einen Benutzer zu einer Task hinzu.
   * 
   * Guard-Checks:
   * - Requester ist Task-Owner ODER hat WRITE-Permission
   * - Ziel-User existiert
   * - User ist nicht bereits Mitglied
   */
  async addMember(
    taskId: number,
    userId: number,
    requesterId: number,
  ) {
    // Task existiert?
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }

    // Requester darf hinzufügen? (Owner oder WRITE-Permission)
    const isOwner = task.created_by === requesterId;
    const hasWritePermission = await this.checkPermission(
      requesterId,
      taskId,
      TaskPermissionFlags.WRITE,
    );

    if (!isOwner && !hasWritePermission) {
      throw new ForbiddenException(
        'Sie haben keine Berechtigung, Mitglieder hinzuzufügen',
      );
    }

    // Ziel-User existiert?
    const targetUser = await this.prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`Benutzer ${userId} nicht gefunden`);
    }

    // Nicht bereits Mitglied?
    const existingMember = await this.prisma.task_members.findUnique({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('Benutzer ist bereits Mitglied dieser Task');
    }

    // Hinzufügen
    return await this.prisma.task_members.create({
      data: {
        task_id: taskId,
        user_id: userId,
      },
    });
  }

  /**
   * Entfernt einen Benutzer von einer Task.
   * 
   * Guard-Checks:
   * - Requester ist Task-Owner ODER hat WRITE-Permission
   * - Nicht der Task-Creator selbst (implizit Mitglied)
   */
  async removeMember(
    taskId: number,
    userId: number,
    requesterId: number,
  ): Promise<void> {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }

    // Requester darf entfernen?
    const isOwner = task.created_by === requesterId;
    const hasWritePermission = await this.checkPermission(
      requesterId,
      taskId,
      TaskPermissionFlags.WRITE,
    );

    if (!isOwner && !hasWritePermission) {
      throw new ForbiddenException(
        'Sie haben keine Berechtigung, Mitglieder zu entfernen',
      );
    }

    // Nicht den Creator entfernen
    if (task.created_by === userId) {
      throw new BadRequestException(
        'Der Task-Creator kann nicht als Mitglied entfernt werden',
      );
    }

    // Nicht den Zugewiesenen entfernen
    if (task.assigned_to === userId) {
      throw new BadRequestException(
        'Der zugewiesene Benutzer kann nicht als Mitglied entfernt werden',
      );
    }

    // Entfernen
    await this.prisma.task_members.delete({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });
  }

  /**
   * Listet alle Mitglieder einer Task auf.
   * 
   * Guard-Checks:
   * - Requester ist Mitglied ODER hat READ-Permission
   */
  async findByTask(taskId: number) {
    return await this.prisma.task_members.findMany({
      where: { task_id: taskId },
      include: {
        users: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Prüft, ob ein User Mitglied einer Task ist.
   */
  async isMember(taskId: number, userId: number): Promise<boolean> {
    // Implizite Mitgliedschaften
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      select: { created_by: true, assigned_to: true },
    });

    if (!task) return false;

    // Creator oder Assigned sind implizit Mitgleider
    if (task.created_by === userId || task.assigned_to === userId) {
      return true;
    }

    // Explizite Mitgliedschaft
    const member = await this.prisma.task_members.findUnique({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });

    return !!member;
  }

  /**
   * Prüft bitweise, ob ein User die nötige Permission für eine Task hat.
   * 
   * Beispiele:
   * - checkPermission(123, 42, 4)  → User 123 kann Task 42 LESEN?
   * - checkPermission(123, 42, 2)  → User 123 kann Task 42 ÄNDERN?
   * - checkPermission(123, 42, 1)  → User 123 kann Task 42 AUSFÜHREN?
   * 
   * Rückgabe: true wenn (flags & requiredFlags) === requiredFlags
   */
  async checkPermission(
    userId: number,
    taskId: number,
    requiredFlags: number, // 1, 2, 4 oder Kombinationen (3, 5, 6, 7)
  ): Promise<boolean> {
    // Task-Creator hat immer RWX
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      select: { created_by: true },
    });

    if (!task) return false;

    if (task.created_by === userId) {
      return true; // Creator hat alle Rechte
    }

    // Permissions aus der Datenbank abrufen
    const userPerms = await this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });

    // Prüfe zeitliche Gültigkeit und bitweise Flags
    for (const perm of userPerms) {
      const now = new Date();

      // Gültig?
      if (perm.valid_from && perm.valid_from > now) {
        continue; // Noch nicht gültig
      }

      if (perm.valid_to && perm.valid_to < now) {
        continue; // Abgelaufen
      }

      // Hat Permission die erforderlichen Flags?
      const hasFlags = (perm.permissions.flags & requiredFlags) === requiredFlags;

      if (hasFlags) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extrahiert rwx Permissions aus den bitweisen Flags.
   * 
   * Beispiel:
   * Input: 7 (0b111)
   * Output: { read: true, write: true, execute: true }
   */
  extractPermissions(flags: number): {
    read: boolean;
    write: boolean;
    execute: boolean;
  } {
    return {
      read: (flags & TaskPermissionFlags.READ) !== 0,
      write: (flags & TaskPermissionFlags.WRITE) !== 0,
      execute: (flags & TaskPermissionFlags.EXECUTE) !== 0,
    };
  }

  /**
   * Berechnet bitweise Flags aus rwx.
   * 
   * Beispiel:
   * Input: { read: true, write: true, execute: false }
   * Output: 6 (0b110)
   */
  computeFlags(perms: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
  }): number {
    let flags = 0;

    if (perms.read) flags |= TaskPermissionFlags.READ;
    if (perms.write) flags |= TaskPermissionFlags.WRITE;
    if (perms.execute) flags |= TaskPermissionFlags.EXECUTE;

    return flags;
  }
}
