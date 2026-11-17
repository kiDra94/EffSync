import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TaskService } from "./task.service";
import { TaskRepository } from "./ports/task.repository";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import type { Transaction } from "../../../shared/domain/transaction";

// T59, decision Q8e (M18): tags are set through the task create and update
describe("TaskService tags", () => {
  let tasks: Record<string, jest.Mock>;
  let templates: { assertOwner: jest.Mock };
  let service: TaskService;

  beforeEach(() => {
    const row = {
      task_id: 9,
      title: "A",
      status: "TODO",
      created_by: 5,
      assigned_to: null,
    };
    tasks = {
      findById: jest.fn().mockResolvedValue({ ...row, is_locked: false }),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      addMember: jest.fn(),
      setTags: jest.fn(),
      findRow: jest.fn().mockResolvedValue({ ...row, task_tags: [] }),
      findMemberIds: jest.fn().mockResolvedValue([]),
    };
    templates = { assertOwner: jest.fn().mockResolvedValue(undefined) };
    const unitOfWork = {
      run: (work: (tx: Transaction) => Promise<unknown>) =>
        work({} as Transaction),
    };
    service = new TaskService(
      tasks as unknown as TaskRepository,
      { create: jest.fn() } as never,
      {} as never,
      {} as never,
      {
        completeParentsOf: jest.fn().mockResolvedValue([]),
        notify: jest.fn(),
      } as never,
      {} as never,
      unitOfWork as unknown as UnitOfWork,
      { taskAssigned: jest.fn(), statusChanged: jest.fn() } as never,
      {} as never,
      templates as never,
    );
  });

  it("sets the normalized tags of a new task, not as a task column", async () => {
    await service.create(
      { title: "A", deadline: "2026-12-01", tags: ["Mathe", " mathe", "Test"] },
      5,
    );

    expect((tasks.create.mock.calls as unknown[][])[0][0]).not.toHaveProperty(
      "tags",
    );
    expect(tasks.setTags).toHaveBeenCalledWith(9, ["mathe", "test"]);
  });

  it("replaces the tags on update, and leaves them alone without `tags`", async () => {
    await service.update(9, { tags: ["Projekt"] }, 5);
    await service.update(9, { title: "B" }, 5);

    expect((tasks.update.mock.calls as unknown[][])[0][1]).not.toHaveProperty(
      "tags",
    );
    expect(tasks.setTags).toHaveBeenCalledTimes(1);
    expect(tasks.setTags).toHaveBeenCalledWith(9, ["projekt"]);
  });

  // review M18 (1): the update's answer carries the new tags
  it("writes the tags before the task update reads its relations", async () => {
    await service.update(9, { tags: ["Projekt"] }, 5);

    expect(tasks.setTags.mock.invocationCallOrder[0]).toBeLessThan(
      tasks.update.mock.invocationCallOrder[0],
    );
  });

  // review M18 (2): a task links only the requester's own template (E1)
  it("checks the template on update and on create, also template 0", async () => {
    await service.update(9, { template_id: 3 }, 5);
    expect(templates.assertOwner).toHaveBeenCalledWith(3, 5);

    templates.assertOwner.mockRejectedValue(new NotFoundException());
    await expect(
      service.create({ title: "A", deadline: "2026-12-01", template_id: 0 }, 5),
    ).rejects.toThrow(NotFoundException);
  });

  it("unlinks the template on update with null, without a check", async () => {
    await service.update(9, { template_id: null as never }, 5);

    expect(templates.assertOwner).not.toHaveBeenCalled();
  });

  // review M18 (8): the length is checked on the stored (lowercased) name
  it("answers 400 for a tag that is longer than 50 characters once normalized", async () => {
    await expect(
      service.create(
        { title: "A", deadline: "2026-12-01", tags: ["İ".repeat(30)] },
        5,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(tasks.create).not.toHaveBeenCalled();
  });

  // review of the Definition-of-done refactor: the tag check keeps its place,
  // before the priority and T100 checks, as before the split of update
  it("checks the tags before the priority", async () => {
    tasks.priorityExists = jest.fn().mockResolvedValue(false);

    await expect(
      service.update(9, { tags: ["x".repeat(60)], priority_id: 9999 }, 5),
    ).rejects.toThrow("Ein Tag darf höchstens 50 Zeichen lang sein");
    expect(tasks.priorityExists).not.toHaveBeenCalled();
  });
});
