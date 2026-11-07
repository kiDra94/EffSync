/**
 * Characterization tests for the task use cases (GOALS.md M1), split in M15
 * along the application services. They pin the behavior before the
 * refactor. Where that behavior contradicts the thesis, the test is marked
 * `// THESIS: <claim ID>` and gets flipped in the milestone that fixes the
 * claim. Known bugs are marked `// BUG (...)`.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { TaskService } from "./task.service";
import {
  createPrismaMock,
  createTaskServices,
  FindManyArgs,
  PrismaMock,
  studentRoles,
  teacherRoles,
} from "./task.characterization.fixtures";

describe("TaskService: update, delete and subtasks (characterization, M1)", () => {
  let prisma: PrismaMock;
  let gateway: { emitTaskUpdated: jest.Mock; emitTaskLocked: jest.Mock };
  let activityLog: { create: jest.Mock };
  let service: TaskService;

  beforeEach(() => {
    prisma = createPrismaMock();
    gateway = { emitTaskUpdated: jest.fn(), emitTaskLocked: jest.fn() };
    activityLog = { create: jest.fn() };
    service = createTaskServices(prisma, gateway, activityLog).taskService;
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const asStaff = (staff: boolean) =>
    prisma.user_roles.count.mockResolvedValue(staff ? 1 : 0);

  const firstFindManyWhere = () =>
    (
      (
        prisma.tasks.findMany.mock.calls as unknown[][]
      )[0][0] as FindManyArgs & {
        where: Record<string, unknown>;
      }
    ).where;

  describe("update", () => {
    let tasks: Record<
      number,
      {
        task_id: number;
        parent_task_id: number | null;
        is_locked?: boolean;
        created_by?: number;
      }
    >;

    beforeEach(() => {
      tasks = {
        1: {
          task_id: 1,
          parent_task_id: null,
          is_locked: false,
          created_by: 5,
        },
        2: { task_id: 2, parent_task_id: 1 },
        3: { task_id: 3, parent_task_id: 2 },
        4: { task_id: 4, parent_task_id: null },
      };
      prisma.tasks.findUnique.mockImplementation(
        (args: { where: { task_id: number } }) =>
          Promise.resolve(tasks[args.where.task_id] ?? null),
      );
      prisma.tasks.update.mockImplementation(
        (args: { where: { task_id: number }; data: Record<string, unknown> }) =>
          Promise.resolve({
            task_id: args.where.task_id,
            title: "T",
            created_by: 5,
            parent_task_id: null,
            ...args.data,
          }),
      );
    });

    it("throws 404 for an unknown task", async () => {
      await expect(service.update(99, {}, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects edits of a locked task by anyone but the creator", async () => {
      tasks[1].is_locked = true;

      await expect(service.update(1, { title: "x" }, 6)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, { title: "x" }, 5)).resolves.toEqual(
        expect.objectContaining({ title: "x" }),
      );
    });

    it("rejects a task as its own parent", async () => {
      await expect(service.update(1, { parent_task_id: 1 }, 5)).rejects.toThrow(
        "Task cannot be its own parent",
      );
    });

    it("throws 404 for an unknown parent", async () => {
      await expect(
        service.update(1, { parent_task_id: 99 }, 5),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects a circular parent with 400 (T01, T103)", async () => {
      // 3 -> 2 -> 1, so 1 cannot become a child of 3
      await expect(service.update(1, { parent_task_id: 3 }, 5)).rejects.toThrow(
        "Circular reference detected: Task cannot be ancestor of itself",
      );
      expect(prisma.tasks.update).not.toHaveBeenCalled();
    });

    it("accepts a valid new parent", async () => {
      await service.update(1, { parent_task_id: 4 }, 5);
      expect(prisma.tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parent_task_id: 4 }) as unknown,
        }),
      );
    });

    it("throws 404 for an unknown priority", async () => {
      prisma.priorities.findUnique.mockResolvedValue(null);
      await expect(service.update(1, { priority_id: 9 }, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("ignores is_locked, locked_reason and locked_until from the body", async () => {
      await service.update(
        1,
        { is_locked: true, locked_reason: "x", title: "y" } as never,
        5,
      );

      const data = (
        (prisma.tasks.update.mock.calls as unknown[][])[0][0] as {
          data: Record<string, unknown>;
        }
      ).data;
      expect(data).not.toHaveProperty("is_locked");
      expect(data).not.toHaveProperty("locked_reason");
      expect(data.title).toBe("y");
    });

    // THESIS: T100 – COMPLETED is accepted although progress is below 100
    it("accepts COMPLETED with progress below 100", async () => {
      const result = await service.update(
        1,
        { status: "COMPLETED", progress: 40 },
        5,
      );

      expect(result.status).toBe("COMPLETED");
      expect(result.progress).toBe(40);
    });

    it("logs the update under the task creator, not the acting user", async () => {
      await service.update(1, { title: "neu" }, 6);
      expect(activityLog.create).toHaveBeenCalledWith(
        { task_id: 1, action: 'Task updated: "neu"' },
        5,
        false,
      );
    });

    // THESIS: T32 (L1, flipped in M15) – the update and its activity-log entry share one
    // transaction: a failed log write fails the use case inside $transaction, so it rolls back
    it("fails the update inside its transaction when the activity-log write fails", async () => {
      activityLog.create.mockRejectedValue(new Error("log down"));
      await expect(service.update(1, { title: "neu" }, 5)).rejects.toThrow(
        "log down",
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.tasks.update).toHaveBeenCalled();
    });

    it("runs the parent auto-completion when the updated task has a parent", async () => {
      prisma.tasks.update.mockResolvedValue({
        task_id: 2,
        title: "T",
        created_by: 5,
        parent_task_id: 1,
      });

      await service.update(2, { title: "T" }, 5);

      expect(prisma.tasks.findMany).toHaveBeenCalledWith({
        where: { completion_rule: { not: expect.anything() as unknown } },
      });
    });
  });

  describe("remove", () => {
    beforeEach(() => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        status: "COMPLETED",
        created_by: 5,
      });
    });

    // THESIS: T32 (flipped in M15, decision Q8g) – the delete is logged with the task title, and
    // the task's log rows stay with task_id = null; comments and grading remarks go with it (Q16)
    it("lets the creator delete without a permission check, logs the delete and keeps the log rows, in one transaction", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        title: "Referat",
        status: "COMPLETED",
        created_by: 5,
      });
      const result = await service.remove(1, 5);

      expect(prisma.user_permissions.findFirst).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(activityLog.create).toHaveBeenCalledWith(
        { task_id: 1, action: 'Task deleted: "Referat"' },
        5,
        false,
      );
      expect(prisma.task_activity_log.updateMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
        data: { task_id: null },
      });
      expect(prisma.task_activity_log.deleteMany).not.toHaveBeenCalled();
      expect(prisma.task_grade.deleteMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(prisma.task_documents.deleteMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(prisma.comments.deleteMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(prisma.chat_rooms.updateMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
        data: { task_id: null },
      });
      expect(prisma.tasks.delete).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(result).toEqual({
        message: "Task deleted successfully",
        task_id: 1,
      });
    });

    it("skips the permission check when no requester is given", async () => {
      await service.remove(1);
      expect(prisma.user_permissions.findFirst).not.toHaveBeenCalled();
      expect(prisma.tasks.delete).toHaveBeenCalled();
    });

    it("lets a non-creator with a valid direct delete permission (READ flag) delete", async () => {
      prisma.user_permissions.findFirst.mockResolvedValue({
        valid_from: null,
        valid_to: null,
        permissions: { flags: 4 },
      });

      await service.remove(1, 6);

      expect(prisma.tasks.delete).toHaveBeenCalled();
    });

    it("falls back to the role permission when the direct permission has expired", async () => {
      prisma.user_permissions.findFirst.mockResolvedValue({
        valid_from: null,
        valid_to: new Date(Date.now() - 60_000),
        permissions: { flags: 7 },
      });
      prisma.user_roles.findFirst.mockResolvedValue({
        roles: { roles_permissions: [{ permissions: { flags: 7 } }] },
      });

      await service.remove(1, 6);

      expect(prisma.user_roles.findFirst).toHaveBeenCalled();
      expect(prisma.tasks.delete).toHaveBeenCalled();
    });

    // characterizes problem 5 / T94: the inline check tests the READ bit (4), not a delete-specific flag
    it("rejects a permission whose flags lack the READ bit", async () => {
      prisma.user_permissions.findFirst.mockResolvedValue({
        valid_from: null,
        valid_to: null,
        permissions: { flags: 2 },
      });
      prisma.user_roles.findFirst.mockResolvedValue({
        roles: { roles_permissions: [{ permissions: { flags: 3 } }] },
      });

      await expect(service.remove(1, 6)).rejects.toThrow(ForbiddenException);
      expect(prisma.tasks.delete).not.toHaveBeenCalled();
    });

    it("rejects a non-creator without any delete permission with 403", async () => {
      await expect(service.remove(1, 6)).rejects.toThrow(
        "Missing permission: delete_tasks",
      );
    });

    it("rejects deleting a task that still has subtasks (T108)", async () => {
      prisma.tasks.count.mockResolvedValue(2);

      await expect(service.remove(1, 5)).rejects.toThrow(
        "Cannot delete task with 2 subtask(s)",
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("subtasks, parent changes and related lists", () => {
    beforeEach(() => {
      prisma.tasks.findUnique.mockImplementation(
        (args: { where: { task_id: number } }) =>
          Promise.resolve({
            task_id: args.where.task_id,
            status: "COMPLETED",
            parent_task_id: null,
          }),
      );
    });

    it("creates a subtask under an existing parent", async () => {
      prisma.tasks.create.mockResolvedValue({ task_id: 9, title: "Sub" });

      await service.createSubTask(1, { title: "Sub" } as never, 5);

      expect(prisma.tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parent_task_id: 1,
            created_by: 5,
          }) as unknown,
        }),
      );
    });

    it("lists the direct subtasks oldest first", async () => {
      await service.getSubtasksOfTask(1, false);
      expect(prisma.tasks.findMany).toHaveBeenCalledWith({
        where: { parent_task_id: 1 },
        include: undefined,
        orderBy: { created_at: "asc" },
      });
    });

    it("changes the parent", async () => {
      await service.changeTaskParent(2, 1);
      expect(prisma.tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { task_id: 2 },
          data: expect.objectContaining({ parent_task_id: 1 }) as unknown,
        }),
      );
    });

    // BUG (fixed in M15): the own-parent check in changeTaskParent was dead code, because the
    // cycle check threw first; now both use cases check it first and give the same error
    it("reports a task as its own parent the same way as update()", async () => {
      await expect(service.changeTaskParent(1, 1)).rejects.toThrow(
        "Task cannot be its own parent",
      );
      await expect(
        service.update(1, { parent_task_id: 1 }, undefined),
      ).rejects.toThrow("Task cannot be its own parent");
    });

    it("returns the documents linked to a task", async () => {
      prisma.task_documents.findMany.mockResolvedValue([
        { documents: { document_id: 3 } },
      ]);
      await expect(service.getDocuments(1)).resolves.toEqual([
        { document_id: 3 },
      ]);
    });

    // M15 (decision Q16): the discussion comments are in `comments`
    it("returns comments oldest first and the activity log newest first", async () => {
      await service.getComments(1);
      await service.getActivityLog(1);
      expect(prisma.comments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { task_id: 1 },
          orderBy: { created_at: "asc" },
        }),
      );
      expect(prisma.task_activity_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { task_id: 1 },
          orderBy: { timestamp: "desc" },
        }),
      );
    });
  });
});
