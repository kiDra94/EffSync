import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaReportingRepository } from "./prisma-reporting.repository";

// M24: the queries behind the new metrics; M37: in SQL over the scope, so the
// visible set never leaves the database (the E2E tests run them for real)
describe("PrismaReportingRepository", () => {
  const prisma = {
    users: { findMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const repo = new PrismaReportingRepository(
    prisma as unknown as PrismaService,
  );
  const lastQuery = () =>
    (prisma.$queryRaw.mock.calls as [Prisma.Sql][]).at(-1)![0];

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([]);
  });

  it("finds the user's top-level tasks that aren't completed as projects (decision Q2)", async () => {
    await repo.findActiveProjects({ viewerId: 7 });

    const query = lastQuery();
    expect(query.sql).toMatch(/WITH RECURSIVE visible AS/);
    expect(query.sql).toMatch(/t\.parent_task_id IS NULL/);
    expect(query.sql).toMatch(/t\.status <> 'COMPLETED'/);
    expect(query.values).toContain(7);
  });

  it("reads no task without a user", async () => {
    await repo.findTasks({ none: true });

    expect(lastQuery().sql).toMatch(/WHERE FALSE/);
  });

  it("reads all tasks for staff without the visible set", async () => {
    await repo.findTasks({ all: true });

    expect(lastQuery().sql).not.toMatch(/visible/);
  });

  it("counts by status and overdue flag, as numbers", async () => {
    prisma.$queryRaw.mockResolvedValue([
      { status: "TODO", overdue: true, count: BigInt(2), progress: BigInt(40) },
    ]);
    const now = new Date("2026-11-09T10:00:00Z");

    await expect(repo.countByStatus({ viewerId: 7 }, now)).resolves.toEqual([
      { status: "TODO", overdue: true, count: 2, progress: 40 },
    ]);
    expect(lastQuery().sql).toMatch(/GROUP BY/);
    // review M37: as UTC text with its Z, so the session time zone can't
    // move the boundary (a bare Date went over as text without an offset)
    expect(lastQuery().values).toContain("2026-11-09T10:00:00.000Z");
    expect(lastQuery().sql).toMatch(/\?::timestamptz AT TIME ZONE 'UTC'/);
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
    prisma.$queryRaw.mockResolvedValue([
      { user_id: 5, completed: BigInt(3) },
      { user_id: 4, completed: BigInt(1) },
    ]);
    prisma.users.findMany.mockResolvedValue([
      { user_id: 4, firstname: "Felix", lastname: "Fuchs" },
      { user_id: 5, firstname: "Laura", lastname: "Gruber" },
    ]);

    await expect(repo.findTopAssignees({ all: true }, 5)).resolves.toEqual([
      { user_id: 5, firstname: "Laura", lastname: "Gruber", completed: 3 },
      { user_id: 4, firstname: "Felix", lastname: "Fuchs", completed: 1 },
    ]);
    expect(lastQuery().sql).toMatch(/t\.status = 'COMPLETED'/);
    expect(lastQuery().values).toContain(5);
  });
});
