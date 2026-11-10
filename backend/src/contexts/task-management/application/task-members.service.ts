import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  GHOST_USER_ID,
  PermissionsService,
} from "../../identity-access/application";
import {
  MemberUser,
  TaskMemberRepository,
} from "./ports/task-member.repository";
import { TaskNotificationsService } from "./task-notifications.service";
import { withProfilePicture } from "../../../shared/application/profile-picture";

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

/** A member of a task: explicit, or implicitly the creator or the assignee. */
interface TaskMemberView {
  task_id: number;
  user_id: number;
  joined_at: Date | null;
  users: MemberUserView | null;
  role: "creator" | "assigned" | "member";
}

/** A member's user with the avatar as profile_picture (M27, decision Q8c). */
type MemberUserView = Omit<MemberUser, "user_avatars"> & {
  profile_picture: string | null;
};
const userView = (user: MemberUser | null): MemberUserView | null =>
  user && withProfilePicture(user);

/** Task members (T44): add, remove, list, and the rwx check on a task. */
@Injectable()
export class TaskMembersService {
  constructor(
    private readonly members: TaskMemberRepository,
    private readonly notifications: TaskNotificationsService,
    private readonly permissions: PermissionsService,
  ) {}

  /**
   * The flags of the user's direct grants that are valid now. They come from
   * identity-access (Definition of done: permission data only through
   * PermissionsService), not from a query of this context's own.
   */
  private async validGrantFlags(userId: number): Promise<number[]> {
    const now = new Date();
    return (await this.permissions.getActivePermissions(userId))
      .filter((grant) => !(grant.valid_from && grant.valid_from > now)) // not valid yet
      .filter((grant) => !(grant.valid_to && grant.valid_to < now)) // expired
      .map((grant) => grant.flags);
  }

  /**
   * Adds a user to a task: the requester is the task owner or has WRITE, the
   * target user exists, and isn't a member yet.
   */
  async addMember(taskId: number, userId: number, requesterId: number) {
    const task = await this.members.findTask(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }

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

    // the ghost user (M14) is no real person
    if (userId === GHOST_USER_ID) {
      throw new BadRequestException("Der Ghost-User kann kein Mitglied werden");
    }
    if (!(await this.members.userExists(userId))) {
      throw new NotFoundException(`Benutzer ${userId} nicht gefunden`);
    }
    if (await this.members.findMember(taskId, userId)) {
      throw new BadRequestException(
        "Benutzer ist bereits Mitglied dieser Task",
      );
    }

    const member = await this.members.create(taskId, userId);
    await this.notifications.memberAdded(task, userId, requesterId);
    return member;
  }

  /**
   * Removes a user from a task: the requester is the owner or has WRITE; the
   * creator and the assignee (implicit members) can't be removed.
   */
  async removeMember(
    taskId: number,
    userId: number,
    requesterId: number,
  ): Promise<void> {
    const task = await this.members.findTask(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }

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
    if (task.created_by === userId) {
      throw new BadRequestException(
        "Der Task-Creator kann nicht als Mitglied entfernt werden",
      );
    }
    if (task.assigned_to === userId) {
      throw new BadRequestException(
        "Der zugewiesene Benutzer kann nicht als Mitglied entfernt werden",
      );
    }

    await this.members.delete(taskId, userId);
    await this.notifications.memberRemoved(task, userId, requesterId);
  }

  /** All members of a task: the creator, the assignee and the explicit members. */
  async findByTaskIncludingImplicit(taskId: number): Promise<TaskMemberView[]> {
    const task = await this.members.findTaskWithPeople(taskId);
    if (!task) return [];

    const memberMap = new Map<number, TaskMemberView>();
    // the ghost user 0 owns deleted accounts' tasks but is nobody's member
    if (task.created_by !== GHOST_USER_ID) {
      memberMap.set(task.created_by, {
        task_id: taskId,
        user_id: task.created_by,
        joined_at: task.created_at,
        users: userView(task.users_tasks_created_byTousers),
        role: "creator",
      });
    }
    if (task.assigned_to && task.users_tasks_assigned_toTousers) {
      memberMap.set(task.assigned_to, {
        task_id: taskId,
        user_id: task.assigned_to,
        joined_at: task.created_at,
        users: userView(task.users_tasks_assigned_toTousers),
        role: "assigned",
      });
    }

    for (const member of await this.members.findMembersWithUsers(taskId)) {
      // implicit members stay as they are
      if (!memberMap.has(member.user_id)) {
        memberMap.set(member.user_id, {
          task_id: member.task_id,
          user_id: member.user_id,
          joined_at: member.joined_at,
          users: userView(member.users),
          role: "member",
        });
      }
    }
    return Array.from(memberMap.values());
  }

  /** The members, for a requester who is a member or has READ on the task. */
  async findMembersFor(taskId: number, requesterId: number) {
    const mayRead =
      (await this.isMember(taskId, requesterId)) ||
      (await this.checkPermission(
        requesterId,
        taskId,
        TaskPermissionFlags.READ,
      ));
    if (!mayRead) {
      throw new ForbiddenException(
        "Sie haben keine Berechtigung, die Mitglieder zu sehen",
      );
    }
    return this.findByTaskIncludingImplicit(taskId);
  }

  async findByTask(taskId: number) {
    return (await this.members.findMembersWithUsers(taskId)).map((member) => ({
      ...member,
      users: userView(member.users),
    }));
  }

  /** Creator and assignee are implicit members. */
  async isMember(taskId: number, userId: number): Promise<boolean> {
    const task = await this.members.findMembership(taskId);
    if (!task) return false;
    if (task.created_by === userId || task.assigned_to === userId) {
      return true;
    }
    return !!(await this.members.findMember(taskId, userId));
  }

  /**
   * Whether the user has the flags on the task: the creator always has RWX,
   * everyone else needs a valid direct permission with all the flags.
   */
  async checkPermission(
    userId: number,
    taskId: number,
    requiredFlags: number,
  ): Promise<boolean> {
    const task = await this.members.findCreator(taskId);
    if (!task) return false;
    if (task.created_by === userId) return true;

    return (await this.validGrantFlags(userId)).some(
      (flags) => (flags & requiredFlags) === requiredFlags,
    );
  }

  /** The requester's rwx on the task, from one creator and one permission query. */
  async permissionFlags(userId: number, taskId: number) {
    const task = await this.members.findCreator(taskId);
    let flags = 0;
    if (task && task.created_by === userId) {
      flags = TaskPermissionFlags.RWX;
    } else if (task) {
      for (const grantFlags of await this.validGrantFlags(userId)) {
        flags |= grantFlags & TaskPermissionFlags.RWX;
      }
    }
    return {
      has_read: (flags & TaskPermissionFlags.READ) !== 0,
      has_write: (flags & TaskPermissionFlags.WRITE) !== 0,
      has_execute: (flags & TaskPermissionFlags.EXECUTE) !== 0,
      permission_flags: flags,
    };
  }

  /** rwx from the bitwise flags, e.g. 7 → read, write and execute. */
  extractPermissions(flags: number) {
    return {
      read: (flags & TaskPermissionFlags.READ) !== 0,
      write: (flags & TaskPermissionFlags.WRITE) !== 0,
      execute: (flags & TaskPermissionFlags.EXECUTE) !== 0,
    };
  }

  /** The bitwise flags from rwx, e.g. read and write → 6. */
  computeFlags(perms: { read?: boolean; write?: boolean; execute?: boolean }) {
    let flags = 0;
    if (perms.read) flags |= TaskPermissionFlags.READ;
    if (perms.write) flags |= TaskPermissionFlags.WRITE;
    if (perms.execute) flags |= TaskPermissionFlags.EXECUTE;
    return flags;
  }
}
