import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  ActivityLogQuery,
  ActivityLogRepository,
  NewActivityEntry,
} from "../../application/ports/activity-log.repository";

const WITH_USER = {
  users: {
    select: { user_id: true, email: true, firstname: true, lastname: true },
  },
} as const;

/** The activity log on Prisma; writes join the use case's unit of work (T32). */
@Injectable()
export class PrismaActivityLogRepository extends ActivityLogRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  append(entry: NewActivityEntry, userId: number, includeRelations: boolean) {
    return this.db.task_activity_log.create({
      data: { ...entry, user_id: userId },
      include: includeRelations ? WITH_USER : undefined,
    });
  }

  findForTask(taskId: number, includeRelations: boolean) {
    return this.db.task_activity_log.findMany({
      where: { task_id: taskId },
      include: includeRelations ? WITH_USER : undefined,
      orderBy: { timestamp: "desc" },
    });
  }

  async findPage(query: ActivityLogQuery) {
    const where: Prisma.task_activity_logWhereInput = {};
    if (query.userId !== undefined) where.user_id = query.userId;
    if (query.action) {
      where.action = { contains: query.action, mode: "insensitive" };
    }
    if (query.from || query.to) {
      where.timestamp = { gte: query.from, lte: query.to };
    }
    const [entries, total] = await Promise.all([
      this.db.task_activity_log.findMany({
        where,
        include: WITH_USER,
        orderBy: [{ timestamp: "desc" }, { log_id: "desc" }],
        skip: query.skip,
        take: query.take,
      }),
      this.db.task_activity_log.count({ where }),
    ]);
    return { entries, total };
  }

  async detachFromTask(taskId: number) {
    await this.db.task_activity_log.updateMany({
      where: { task_id: taskId },
      data: { task_id: null },
    });
  }
}
