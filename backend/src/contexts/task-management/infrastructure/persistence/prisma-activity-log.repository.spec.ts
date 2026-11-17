import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaActivityLogRepository } from "./prisma-activity-log.repository";

// T33, decision A2 (M15): the audit log's filters, newest first, and the
// deleted tasks' entries are included (no task filter)
describe("PrismaActivityLogRepository.findPage", () => {
  it("filters by user, action and period", async () => {
    const db = {
      task_activity_log: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new PrismaActivityLogRepository({
      client: () => db,
    } as unknown as PrismaUnitOfWork);
    const from = new Date("2026-11-01");
    const to = new Date("2026-11-07");

    await repository.findPage({
      userId: 2,
      action: "deleted",
      from,
      to,
      skip: 0,
      take: 50,
    });

    const where = {
      user_id: 2,
      action: { contains: "deleted", mode: "insensitive" },
      timestamp: { gte: from, lte: to },
    };
    expect(db.task_activity_log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [{ timestamp: "desc" }, { log_id: "desc" }],
        skip: 0,
        take: 50,
      }),
    );
    expect(db.task_activity_log.count).toHaveBeenCalledWith({ where });
  });
});
