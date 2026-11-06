import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTaskMemberDto } from "./dto/create-task-member.dto";

/**
 * Permission flags (bitwise):
 * READ:    0b100 = 4   (read data)
 * WRITE:   0b010 = 2   (change data)
 * EXECUTE: 0b001 = 1   (run an action)
 * RWX:     0b111 = 7   (full access)
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
   * Adds a user to a task.
   *
   * Guard-Checks:
   * - the requester is the task owner OR has WRITE permission
   * - the target user exists
   * - the user isn't a member yet
   */
  async addMember(taskId: number, userId: number, requesterId: number) {
    // Does the task exist?
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }

    // May the requester add? (owner or WRITE permission)
    const isOwner = task.created_by === requesterId;
    const hasWritePermission = await this.checkPermission(
      requesterId,
      taskId,
      TaskPermissionFlags.WRITE,
    );

    if (!isOwner && !hasWritePermission) {
      throw new ForbiddenException(
        "Sie haben keine Berechtigung, Mitglieder hinzuzufügen",
      );
    }

    // Does the target user exist?
    const targetUser = await this.prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`Benutzer ${userId} nicht gefunden`);
    }

    // Not a member yet?
    const existingMember = await this.prisma.task_members.findUnique({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException(
        "Benutzer ist bereits Mitglied dieser Task",
      );
    }

    // Add
    return await this.prisma.task_members.create({
      data: {
        task_id: taskId,
        user_id: userId,
      },
    });
  }

  /**
   * Removes a user from a task.
   *
   * Guard-Checks:
   * - the requester is the task owner OR has WRITE permission
   * - not the task creator (an implicit member)
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

    // May the requester remove?
    const isOwner = task.created_by === requesterId;
    const hasWritePermission = await this.checkPermission(
      requesterId,
      taskId,
      TaskPermissionFlags.WRITE,
    );

    if (!isOwner && !hasWritePermission) {
      throw new ForbiddenException(
        "Sie haben keine Berechtigung, Mitglieder zu entfernen",
      );
    }

    // Don't remove the creator
    if (task.created_by === userId) {
      throw new BadRequestException(
        "Der Task-Creator kann nicht als Mitglied entfernt werden",
      );
    }

    // Don't remove the assignee
    if (task.assigned_to === userId) {
      throw new BadRequestException(
        "Der zugewiesene Benutzer kann nicht als Mitglied entfernt werden",
      );
    }

    // Remove
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
   * Lists all members of a task.
   *
   * Guard-Checks:
   * - the requester is a member OR has READ permission
   */
  /**
   * Feature: returns ALL members of a task (explicit + implicit)
   * - explicit: the task_members table
   * - implicit: the task creator + the assignee
   */
  async findByTaskIncludingImplicit(taskId: number) {
    // Load the task with its relations
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      include: {
        users_tasks_created_byTousers: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            email: true,
            username: true,
          },
        },
        users_tasks_assigned_toTousers: {
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

    if (!task) {
      return [];
    }

    // A set for unique user IDs
    const memberMap = new Map();

    // 1. Task creator (implicit)
    if (task.created_by && task.users_tasks_created_byTousers) {
      memberMap.set(task.created_by, {
        task_id: taskId,
        user_id: task.created_by,
        joined_at: task.created_at,
        users: task.users_tasks_created_byTousers,
        role: "creator",
      });
    }

    // 2. Assignee (implicit)
    if (task.assigned_to && task.users_tasks_assigned_toTousers) {
      memberMap.set(task.assigned_to, {
        task_id: taskId,
        user_id: task.assigned_to,
        joined_at: task.created_at,
        users: task.users_tasks_assigned_toTousers,
        role: "assigned",
      });
    }

    // 3. Explicit task members
    const explicitMembers = await this.prisma.task_members.findMany({
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

    for (const member of explicitMembers) {
      // Don't overwrite implicit members that are already there
      if (!memberMap.has(member.user_id)) {
        memberMap.set(member.user_id, {
          task_id: member.task_id,
          user_id: member.user_id,
          joined_at: member.joined_at,
          users: member.users,
          role: "member",
        });
      }
    }

    return Array.from(memberMap.values());
  }

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
   * Checks whether a user is a member of a task.
   */
  async isMember(taskId: number, userId: number): Promise<boolean> {
    // Implicit memberships
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      select: { created_by: true, assigned_to: true },
    });

    if (!task) return false;

    // Creator and assignee are implicit members
    if (task.created_by === userId || task.assigned_to === userId) {
      return true;
    }

    // Explicit membership
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
   * Checks bitwise whether a user has the required permission on a task.
   *
   * Examples:
   * - checkPermission(123, 42, 4)  → can user 123 READ task 42?
   * - checkPermission(123, 42, 2)  → can user 123 CHANGE task 42?
   * - checkPermission(123, 42, 1)  → can user 123 EXECUTE task 42?
   *
   * Returns: true if (flags & requiredFlags) === requiredFlags
   */
  async checkPermission(
    userId: number,
    taskId: number,
    requiredFlags: number, // 1, 2, 4 or combinations (3, 5, 6, 7)
  ): Promise<boolean> {
    // The task creator always has RWX
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      select: { created_by: true },
    });

    if (!task) return false;

    if (task.created_by === userId) {
      return true; // The creator has all rights
    }

    // Load the permissions from the database
    const userPerms = await this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });

    // Check the validity period and the bitwise flags
    for (const perm of userPerms) {
      const now = new Date();

      // Valid?
      if (perm.valid_from && perm.valid_from > now) {
        continue; // Not valid yet
      }

      if (perm.valid_to && perm.valid_to < now) {
        continue; // Expired
      }

      // Does the permission have the required flags?
      const hasFlags =
        (perm.permissions.flags & requiredFlags) === requiredFlags;

      if (hasFlags) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extracts the rwx permissions from the bitwise flags.
   *
   * Example:
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
   * Computes the bitwise flags from rwx.
   *
   * Example:
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
