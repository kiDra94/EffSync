import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { TaskMemberRepository } from "../../application/ports/task-member.repository";
import { AVATAR_VERSION } from "../../../../shared/application/profile-picture";

const MEMBER_USER = {
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

/** Task members on Prisma: the queries TaskMembersService made before M15. */
@Injectable()
export class PrismaTaskMemberRepository extends TaskMemberRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  findTask(taskId: number) {
    return this.db.tasks.findUnique({ where: { task_id: taskId } });
  }

  async userExists(userId: number) {
    return !!(await this.db.users.findUnique({ where: { user_id: userId } }));
  }

  findMember(taskId: number, userId: number) {
    return this.db.task_members.findUnique({
      where: { task_id_user_id: { task_id: taskId, user_id: userId } },
    });
  }

  create(taskId: number, userId: number) {
    return this.db.task_members.create({
      data: { task_id: taskId, user_id: userId },
    });
  }

  async delete(taskId: number, userId: number) {
    await this.db.task_members.delete({
      where: { task_id_user_id: { task_id: taskId, user_id: userId } },
    });
  }

  findTaskWithPeople(taskId: number) {
    return this.db.tasks.findUnique({
      where: { task_id: taskId },
      include: {
        users_tasks_created_byTousers: MEMBER_USER,
        users_tasks_assigned_toTousers: MEMBER_USER,
      },
    });
  }

  findMembersWithUsers(taskId: number) {
    return this.db.task_members.findMany({
      where: { task_id: taskId },
      include: { users: MEMBER_USER },
    });
  }

  findMembership(taskId: number) {
    return this.db.tasks.findUnique({
      where: { task_id: taskId },
      select: { created_by: true, assigned_to: true },
    });
  }

  findCreator(taskId: number) {
    return this.db.tasks.findUnique({
      where: { task_id: taskId },
      select: { created_by: true },
    });
  }

  findUserPermissions(userId: number) {
    return this.db.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });
  }
}
