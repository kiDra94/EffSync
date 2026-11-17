import type { Prisma } from "@prisma/client";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import type { TaskPageRequest } from "../../application/ports/task-records";
import { PrismaTaskRepository } from "./prisma-task.repository";

// M37: GET /tasks is filtered, sorted, paged and counted in SQL, the page and
// the count in parallel; only the page's ids come back (the E2E tests run it
// for real)
describe("PrismaTaskRepository.findPage", () => {
  const page: TaskPageRequest = {
    includeRelations: false,
    sortBy: "status",
    sortOrder: "desc",
    skip: 10,
    take: 10,
  };
  let db: { $queryRaw: jest.Mock; tasks: { findMany: jest.Mock } };
  let repository: PrismaTaskRepository;
  const queries = () =>
    (db.$queryRaw.mock.calls as [Prisma.Sql][]).map(([sql]) => sql);
  const isCount = (sql: Prisma.Sql) =>
    /SELECT count\(\*\) AS total/.test(sql.sql);
  // the page query; the count query has the same WHERE
  const query = () => queries().find((sql) => !isCount(sql))!;
  const answer = (ids: number[], total: number) =>
    db.$queryRaw.mockImplementation((sql: Prisma.Sql) =>
      Promise.resolve(
        isCount(sql)
          ? [{ total: BigInt(total) }]
          : ids.map((task_id) => ({ task_id })),
      ),
    );

  beforeEach(() => {
    db = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      tasks: { findMany: jest.fn().mockResolvedValue([]) },
    };
    repository = new PrismaTaskRepository({
      client: () => db,
    } as unknown as PrismaUnitOfWork);
  });

  // M17 review: offset paging needs a total order, so equal sort values
  // can't move a task from one page to the next
  it("breaks ties in the sort order by task id", async () => {
    await repository.findPage({}, { all: true }, page);

    expect(query().sql).toMatch(/ORDER BY t\."status" DESC, t\.task_id ASC/);
    expect(query().values).toEqual(expect.arrayContaining([10, 10]));
    // review M37: no window over all rows, the count runs on its own
    expect(query().sql).not.toMatch(/OVER/);
  });

  it("returns the page's tasks in the order of the query, with its total", async () => {
    answer([3, 1], 12);
    db.tasks.findMany.mockResolvedValue([{ task_id: 1 }, { task_id: 3 }]);

    await expect(repository.findPage({}, { all: true }, page)).resolves.toEqual(
      { tasks: [{ task_id: 3 }, { task_id: 1 }], total: 12 },
    );
    expect(db.tasks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { task_id: { in: [3, 1] } } }),
    );
  });

  it("limits a student to their visible set inside the query", async () => {
    await repository.findPage({}, { viewerId: 7 }, page);

    expect(query().sql).toMatch(/WITH RECURSIVE visible AS/);
    expect(query().sql).toMatch(
      /t\.task_id IN \(SELECT task_id FROM visible\)/,
    );
    expect(query().values).toContain(7);
  });

  it("searches for %, _ and \\ as characters", async () => {
    await repository.findPage({ search: "50%_\\" }, { all: true }, page);

    expect(query().values).toContain("%50\\%\\_\\\\%");
    expect(query().sql).toMatch(/ILIKE/);
  });

  it("maps parent_task_id 0 to top-level tasks", async () => {
    await repository.findPage({ parent_task_id: 0 }, { all: true }, page);

    expect(query().sql).toMatch(/t\.parent_task_id IS NULL/);
  });

  it("counts with the same filter and scope, also past the last page", async () => {
    answer([], 4);

    await expect(
      repository.findPage({ search: "x" }, { viewerId: 7 }, page),
    ).resolves.toEqual({ tasks: [], total: 4 });
    const [count] = queries().filter(isCount);
    expect(count.sql).toMatch(/WITH RECURSIVE visible AS/);
    expect(count.sql).toMatch(/ILIKE/);
    expect(db.tasks.findMany).not.toHaveBeenCalled();
  });

  it("refuses a sort key that isn't a task column", async () => {
    await expect(
      repository.findPage({}, { all: true }, {
        ...page,
        sortBy: "password_hash",
      } as unknown as TaskPageRequest),
    ).rejects.toThrow("Unknown sort key");
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});
