import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaReportingRepository } from "./prisma-reporting.repository";

// M24: the queries behind the new metrics
describe("PrismaReportingRepository", () => {
  const prisma = {
    tasks: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn() },
    users: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const repo = new PrismaReportingRepository(
    prisma as unknown as PrismaService,
  );
  const visible = { task_id: { in: [7, 8] } };

  beforeEach(() => jest.clearAllMocks());

  it("finds the user's top-level tasks that aren't completed as projects (decision Q2)", async () => {
    await repo.findActiveProjects({ taskIds: [7, 8] });

    expect(prisma.tasks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            visible,
            { parent_task_id: null, status: { not: "COMPLETED" } },
          ],
        },
      }),
    );
  });

  it("counts each project's subtree in one recursive query", async () => {
    prisma.$queryRaw.mockResolvedValue([
      { root: 1, total: BigInt(4), completed: BigInt(3) },
    ]);

    const counts = await repo.countSubtrees([1, 2]);

    expect(counts.get(1)).toEqual({ total: 4, completed: 3 });
    expect(counts.has(2)).toBe(false);
    const [strings] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join("?")).toMatch(/WITH RECURSIVE subtree/);
    // no query for no projects
    await expect(repo.countSubtrees([])).resolves.toEqual(new Map());
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("ranks the assignees of completed tasks and adds their names", async () => {
    prisma.tasks.groupBy.mockResolvedValue([
      { assigned_to: 5, _count: { _all: 3 } },
      { assigned_to: 4, _count: { _all: 1 } },
    ]);
    prisma.users.findMany.mockResolvedValue([
      { user_id: 4, firstname: "Felix", lastname: "Fuchs" },
      { user_id: 5, firstname: "Laura", lastname: "Gruber" },
    ]);

    await expect(repo.findTopAssignees({ all: true }, 5)).resolves.toEqual([
      { user_id: 5, firstname: "Laura", lastname: "Gruber", completed: 3 },
      { user_id: 4, firstname: "Felix", lastname: "Fuchs", completed: 1 },
    ]);
    expect(prisma.tasks.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{}, { status: "COMPLETED", assigned_to: { not: null } }],
        },
        take: 5,
      }),
    );
  });

  it("returns no task for an empty visible set", async () => {
    await repo.findTasks({ taskIds: [] });

    expect(prisma.tasks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { task_id: { in: [] } } }),
    );
  });
});
