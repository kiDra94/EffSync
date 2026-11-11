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

  // the chain upwards in one recursive query, like PrismaTaskRepository.
  // isVisibleTo (UNION stops at a cycle), then the tasks with their member
  // rows in a second one (review of M38)
  async findChain(taskId: number) {
    const links = await this.db.$queryRaw<
      { task_id: number; parent_task_id: number | null }[]
    >`
      WITH RECURSIVE chain AS (
        SELECT task_id, parent_task_id FROM tasks WHERE task_id = ${taskId}
        UNION
        SELECT p.task_id, p.parent_task_id FROM tasks p
        JOIN chain c ON p.task_id = c.parent_task_id
      )
      SELECT task_id, parent_task_id FROM chain`;
    if (links.length === 0) return null;
    const tasks = await this.db.tasks.findMany({
      where: { task_id: { in: links.map((link) => link.task_id) } },
      select: {
        task_id: true,
        created_by: true,
        assigned_to: true,
        task_members: { select: { user_id: true, flags: true } },
      },
    });
    // in the order of the chain, from the task upwards
    const parentOf = new Map(links.map((l) => [l.task_id, l.parent_task_id]));
    const byId = new Map(tasks.map((t) => [t.task_id, t]));
    const chain: {
      created_by: number;
      assigned_to: number | null;
      members: { user_id: number; flags: number }[];
    }[] = [];
    const seen = new Set<number>();
    let id: number | null | undefined = taskId;
    while (id !== null && id !== undefined && !seen.has(id)) {
      seen.add(id);
      const task = byId.get(id);
      if (!task) break;
      chain.push({
        created_by: task.created_by,
        assigned_to: task.assigned_to,
        members: task.task_members,
      });
      id = parentOf.get(id);
    }
    return chain;
  }

  setFlags(taskId: number, userId: number, flags: number) {
    return this.db.task_members.update({
      where: { task_id_user_id: { task_id: taskId, user_id: userId } },
      data: { flags },
    });
  }
}
