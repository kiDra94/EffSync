import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaTaskRepository } from "./prisma-task.repository";

// M17 review: offset paging needs a total order, so equal sort values can't
// move a task from one page to the next
describe("PrismaTaskRepository.findPage", () => {
  it("breaks ties in the sort order by task id", async () => {
    const db = {
      tasks: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new PrismaTaskRepository({
      client: () => db,
    } as unknown as PrismaUnitOfWork);

    await repository.findPage({}, undefined, {
      includeRelations: false,
      sortBy: "status",
      sortOrder: "desc",
      skip: 10,
      take: 10,
    });

    expect(db.tasks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ status: "desc" }, { task_id: "asc" }],
      }),
    );
  });
});
