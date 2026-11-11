import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  GHOST_USER_ID,
  PermissionsService,
  PRIVILEGED_ROLES,
} from "../../identity-access/application";
import { effectiveTaskFlags, TaskFlags } from "../domain/task-member-rights";
import {
  MemberUser,
  TaskMemberRepository,
} from "./ports/task-member.repository";
import { TaskNotificationsService } from "./task-notifications.service";
import { withProfilePicture } from "../../../shared/application/profile-picture";

/** A member of a task: explicit, or implicitly the creator or the assignee. */
interface TaskMemberView {
  task_id: number;
  user_id: number;
  joined_at: Date | null;
  users: MemberUserView | null;
  role: "creator" | "assigned" | "member";
  // the member's rights on the task (T99, decision I4, M38)
  flags: number;
  // the rights come from the task or a role, not from the member row
  fixed_flags: boolean;
}

/** A member's user with the avatar as profile_picture (M27, decision Q8c). */
type MemberUserView = Omit<MemberUser, "user_avatars"> & {
  profile_picture: string | null;
};
const userView = (user: MemberUser | null): MemberUserView | null =>
  user && withProfilePicture(user);

/** The task and the tasks above it, the task first (TaskMemberRepository.findChain). */
type TaskChain = NonNullable<
  Awaited<ReturnType<TaskMemberRepository["findChain"]>>
>;

/** A user's flags over the chain (decision I4), with or without a privileged role. */
const flagsFromChain = (
  chain: TaskChain,
  userId: number,
  privileged: boolean,
): number =>
  effectiveTaskFlags({
    userId,
    privileged,
    chain: chain.map((link) => ({
      createdBy: link.created_by,
      assignedTo: link.assigned_to,
      memberFlags:
        link.members.find((member) => member.user_id === userId)?.flags ?? null,
    })),
  });

/**
 * Task members (T44) and their rights on the task (T99, decision I4, M38):
 * READ lists the members, WRITE adds and removes them, EXECUTE changes their
 * flags.
 */
@Injectable()
export class TaskMembersService {
  constructor(
    private readonly members: TaskMemberRepository,
    private readonly notifications: TaskNotificationsService,
    private readonly permissions: PermissionsService,
  ) {}

  /** The task and the tasks above it with their people; 404 without the task. */
  private async chainOf(taskId: number): Promise<TaskChain> {
    const chain = await this.members.findChain(taskId);
    if (!chain) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }
    return chain;
  }

  /**
   * The user's flags over the chain (effectiveTaskFlags). The role is asked
   * only when the tasks don't already give the required flags (review of M38).
   */
  private async flagsIn(
    chain: TaskChain,
    userId: number,
    required: number = TaskFlags.RWX,
  ): Promise<number> {
    const own = flagsFromChain(chain, userId, false);
    if ((own & required) === required) return own;
    return flagsFromChain(chain, userId, await this.isPrivileged(userId));
  }

  private isPrivileged(userId: number) {
    return this.permissions.hasAnyRole(userId, PRIVILEGED_ROLES);
  }

  private async assertMay(
    chain: TaskChain,
    userId: number,
    flag: number,
    message: string,
  ) {
    if (((await this.flagsIn(chain, userId, flag)) & flag) !== flag) {
      throw new ForbiddenException(message);
    }
  }

  /**
   * Adds a user to a task with READ: the requester has WRITE on the task, the
   * target user exists, and isn't a member yet.
   */
  async addMember(taskId: number, userId: number, requesterId: number) {
    const task = await this.members.findTask(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }
    await this.assertMay(
      await this.chainOf(taskId),
      requesterId,
      TaskFlags.WRITE,
      "Sie haben keine Berechtigung, Mitglieder hinzuzufügen",
    );

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
   * Removes a user from a task: the requester has WRITE on the task, and
   * EXECUTE to remove someone who holds it; the creator and the assignee
   * (implicit members) can't be removed.
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
    const chain = await this.chainOf(taskId);
    await this.assertMay(
      chain,
      requesterId,
      TaskFlags.WRITE,
      "Sie haben keine Berechtigung, Mitglieder zu entfernen",
    );
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
    if (!(await this.members.findMember(taskId, userId))) {
      throw new NotFoundException(
        `Benutzer ${userId} ist kein Mitglied dieser Task`,
      );
    }
    // review of M38: who holds EXECUTE is removed only by an EXECUTE holder
    if (((await this.flagsIn(chain, userId)) & TaskFlags.EXECUTE) !== 0) {
      await this.assertMay(
        chain,
        requesterId,
        TaskFlags.EXECUTE,
        "Ein Mitglied mit Ausführungsrecht entfernt nur, wer es selbst hat",
      );
    }

    await this.members.delete(taskId, userId);
    await this.notifications.memberRemoved(task, userId, requesterId);
  }

  /**
   * The creator, the assignee and the explicit members, each with the rights
   * that are enforced (second review of M38): over the whole chain, with the
   * privileged roles of all of them in one query. `fixed_flags`: a creator
   * in the chain or a privileged role, which no member row changes.
   */
  private async listFor(
    taskId: number,
    chain: TaskChain,
  ): Promise<TaskMemberView[]> {
    const task = await this.members.findTaskWithPeople(taskId);
    if (!task) return [];

    const entries: Omit<TaskMemberView, "flags" | "fixed_flags">[] = [];
    // the ghost user 0 owns deleted accounts' tasks but is nobody's member
    if (task.created_by !== GHOST_USER_ID) {
      entries.push({
        task_id: taskId,
        user_id: task.created_by,
        joined_at: task.created_at,
        users: userView(task.users_tasks_created_byTousers),
        role: "creator",
      });
    }
    // a creator assigned to their own task stays the creator
    if (
      task.assigned_to &&
      task.assigned_to !== task.created_by &&
      task.users_tasks_assigned_toTousers
    ) {
      entries.push({
        task_id: taskId,
        user_id: task.assigned_to,
        joined_at: task.created_at,
        users: userView(task.users_tasks_assigned_toTousers),
        role: "assigned",
      });
    }
    for (const member of await this.members.findMembersWithUsers(taskId)) {
      if (entries.some((entry) => entry.user_id === member.user_id)) continue;
      entries.push({
        task_id: member.task_id,
        user_id: member.user_id,
        joined_at: member.joined_at,
        users: userView(member.users),
        role: "member",
      });
    }

    const privileged = await this.permissions.usersWithAnyRole(
      entries.map((entry) => entry.user_id),
      PRIVILEGED_ROLES,
    );
    return entries.map((entry) => ({
      ...entry,
      flags: flagsFromChain(
        chain,
        entry.user_id,
        privileged.has(entry.user_id),
      ),
      fixed_flags:
        privileged.has(entry.user_id) ||
        chain.some((link) => link.created_by === entry.user_id),
    }));
  }

  /** The members with their flags, for a requester with READ on the task. */
  async findMembersFor(taskId: number, requesterId: number) {
    const chain = await this.chainOf(taskId);
    await this.assertMay(
      chain,
      requesterId,
      TaskFlags.READ,
      "Sie haben keine Berechtigung, die Mitglieder zu sehen",
    );
    return this.listFor(taskId, chain);
  }

  /**
   * Sets an explicit member's flags (decision I4): the requester has EXECUTE
   * on the task. The creator's rights come from the task and can't be set,
   * and nobody sets their own.
   */
  async setMemberFlags(
    taskId: number,
    userId: number,
    flags: number,
    requesterId: number,
  ) {
    const task = await this.members.findTask(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} nicht gefunden`);
    }
    await this.assertMay(
      await this.chainOf(taskId),
      requesterId,
      TaskFlags.EXECUTE,
      "Sie haben keine Berechtigung, die Rechte der Mitglieder zu ändern",
    );
    if (task.created_by === userId) {
      throw new BadRequestException(
        "Die Rechte des Task-Creators ergeben sich aus der Aufgabe",
      );
    }
    // review of M38: an EXECUTE holder could otherwise give themselves more
    if (userId === requesterId) {
      throw new ForbiddenException(
        "Die eigenen Rechte kann nur jemand anderes ändern",
      );
    }
    if (!(await this.members.findMember(taskId, userId))) {
      throw new NotFoundException(
        `Benutzer ${userId} ist kein Mitglied dieser Task`,
      );
    }
    return this.members.setFlags(taskId, userId, flags);
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
   * Whether the user has all the flags on the task (T99, decision I4): from
   * the creator, a privileged role, the assignee or the member rows of the
   * task and the tasks above it. Direct grants don't count here.
   */
  async checkPermission(
    userId: number,
    taskId: number,
    requiredFlags: number,
  ): Promise<boolean> {
    const chain = await this.members.findChain(taskId);
    if (!chain) return false;
    const flags = await this.flagsIn(chain, userId, requiredFlags);
    return (flags & requiredFlags) === requiredFlags;
  }

  /** The requester's rwx on the task; 404 without the task. */
  async permissionFlags(userId: number, taskId: number) {
    const flags = await this.flagsIn(await this.chainOf(taskId), userId);
    return {
      has_read: (flags & TaskFlags.READ) !== 0,
      has_write: (flags & TaskFlags.WRITE) !== 0,
      has_execute: (flags & TaskFlags.EXECUTE) !== 0,
      permission_flags: flags,
    };
  }

  /** rwx from the bitwise flags, e.g. 7 → read, write and execute. */
  extractPermissions(flags: number) {
    return {
      read: (flags & TaskFlags.READ) !== 0,
      write: (flags & TaskFlags.WRITE) !== 0,
      execute: (flags & TaskFlags.EXECUTE) !== 0,
    };
  }

  /** The bitwise flags from rwx, e.g. read and write → 6. */
  computeFlags(perms: { read?: boolean; write?: boolean; execute?: boolean }) {
    let flags = 0;
    if (perms.read) flags |= TaskFlags.READ;
    if (perms.write) flags |= TaskFlags.WRITE;
    if (perms.execute) flags |= TaskFlags.EXECUTE;
    return flags;
  }
}
