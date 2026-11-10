import type { Prisma } from "@prisma/client";
import type { TaskRecord } from "./task-records";
import { AVATAR_VERSION } from "../../../../shared/application/profile-picture";

const memberUser = {
  select: {
    user_id: true,
    firstname: true,
    lastname: true,
    email: true,
    username: true,
    // for profile_picture (M27)
    user_avatars: AVATAR_VERSION,
  },
} as const;

export type MemberUser = Prisma.usersGetPayload<typeof memberUser>;
type TaskMemberRecord = Prisma.task_membersGetPayload<object>;
type TaskMemberWithUser = Prisma.task_membersGetPayload<{
  include: { users: typeof memberUser };
}>;
type TaskWithPeople = Prisma.tasksGetPayload<{
  include: {
    users_tasks_created_byTousers: typeof memberUser;
    users_tasks_assigned_toTousers: typeof memberUser;
  };
}>;

/** Task members (port); the queries TaskMembersService made before M15. */
export abstract class TaskMemberRepository {
  abstract findTask(taskId: number): Promise<TaskRecord | null>;
  abstract userExists(userId: number): Promise<boolean>;
  abstract findMember(
    taskId: number,
    userId: number,
  ): Promise<TaskMemberRecord | null>;
  abstract create(taskId: number, userId: number): Promise<TaskMemberRecord>;
  abstract delete(taskId: number, userId: number): Promise<void>;
  abstract findTaskWithPeople(taskId: number): Promise<TaskWithPeople | null>;
  abstract findMembersWithUsers(taskId: number): Promise<TaskMemberWithUser[]>;
  abstract findMembership(
    taskId: number,
  ): Promise<{ created_by: number; assigned_to: number | null } | null>;
  abstract findCreator(taskId: number): Promise<{ created_by: number } | null>;
}
