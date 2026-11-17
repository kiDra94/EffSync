import { NotFoundException } from "@nestjs/common";
import { TaskActivityLogService } from "./activity-log.service";
import { ActivityLogRepository } from "./ports/activity-log.repository";
import { TaskRepository } from "./ports/task.repository";

// T32, T33 (M15): entries are written for an existing task; the admin audit
// log (decision A2) pages over all entries
describe("TaskActivityLogService", () => {
  let entries: { append: jest.Mock; findPage: jest.Mock };
  let tasks: { findById: jest.Mock };
  let service: TaskActivityLogService;

  beforeEach(() => {
    entries = {
      append: jest.fn().mockResolvedValue({ log_id: 1 }),
      findPage: jest
        .fn()
        .mockResolvedValue({ entries: [{ log_id: 9 }], total: 120 }),
    };
    tasks = { findById: jest.fn().mockResolvedValue({ task_id: 3 }) };
    service = new TaskActivityLogService(
      entries as unknown as ActivityLogRepository,
      tasks as unknown as TaskRepository,
    );
  });

  it("appends an entry for an existing task", async () => {
    await service.create({ task_id: 3, action: "x" }, 5, false);

    expect(entries.append).toHaveBeenCalledWith(
      { task_id: 3, action: "x" },
      5,
      false,
    );
  });

  it("rejects an entry for an unknown task with 404", async () => {
    tasks.findById.mockResolvedValue(null);

    await expect(
      service.create({ task_id: 99, action: "x" }, 5),
    ).rejects.toThrow(NotFoundException);
    expect(entries.append).not.toHaveBeenCalled();
  });

  it("pages the audit log with the filters", async () => {
    const from = new Date("2026-11-01");

    const result = await service.findAll({
      userId: 2,
      action: "deleted",
      from,
      page: 3,
      limit: 20,
    });

    expect(entries.findPage).toHaveBeenCalledWith({
      userId: 2,
      action: "deleted",
      from,
      to: undefined,
      skip: 40,
      take: 20,
    });
    expect(result).toEqual({
      data: [{ log_id: 9 }],
      meta: { total: 120, page: 3, limit: 20, totalPages: 6 },
    });
  });
});
