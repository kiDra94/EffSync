/**
 * Characterization tests for TasksService (GOALS.md M1).
 *
 * They pin the current behavior before the refactor. Where that behavior
 * contradicts the thesis, the test is marked `// THESIS: <claim ID>` and gets
 * flipped in the milestone that fixes the claim. Known bugs are marked
 * `// BUG (...)`.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WebsocketGateway } from "../websocket/websocket.gateway";
import { TaskActivityLogService } from "../task-activity-log/task-activity-log.service";
import { PermissionsService } from "../permissions/permissions.service";

type FindManyArgs = {
  where?: {
    parent_task_id?: number | { in?: number[] } | null;
    completion_rule?: unknown;
    status?: string;
  };
};

function createPrismaMock() {
  const prisma = {
    tasks: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    priorities: { findUnique: jest.fn() },
    task_members: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    users: { findMany: jest.fn().mockResolvedValue([]) },
    documents: { findMany: jest.fn().mockResolvedValue([]) },
    user_roles: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    user_permissions: { findFirst: jest.fn().mockResolvedValue(null) },
    task_documents: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    task_comments: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    task_activity_log: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    comments: { updateMany: jest.fn() },
    chat_rooms: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );
  return prisma;
}

const studentRoles = [{ roles: { name: "Student" } }];
// hasAnyRole counts the user's staff roles (Teacher, Admin, Superuser)
const teacherRoles = [{ roles: { name: "Teacher" } }];

describe("TasksService (characterization, M1)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let gateway: { emitTaskUpdated: jest.Mock; emitTaskLocked: jest.Mock };
  let activityLog: { create: jest.Mock };
  let service: TasksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    gateway = { emitTaskUpdated: jest.fn(), emitTaskLocked: jest.fn() };
    activityLog = { create: jest.fn() };
    service = new TasksService(
      prisma as unknown as PrismaService,
      gateway as unknown as WebsocketGateway,
      activityLog as unknown as TaskActivityLogService,
      new PermissionsService(prisma as unknown as PrismaService),
    );
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
      prisma.tasks.findMany.mock.calls[0][0] as FindManyArgs & {
        where: Record<string, unknown>;
      }
    ).where;

  describe("create", () => {
    it("throws 404 when the parent task does not exist", async () => {
      prisma.tasks.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ title: "A", parent_task_id: 9 } as never, 1),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.tasks.create).not.toHaveBeenCalled();
    });

    it("throws 404 when the priority does not exist", async () => {
      prisma.priorities.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ title: "A", priority_id: 9 } as never, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it("uses the requester as creator, ignores created_by from the body, logs and adds the creator as member", async () => {
      prisma.tasks.create.mockResolvedValue({ task_id: 5, title: "A" });

      await service.create(
        { title: "A", created_by: 99, deadline: "2026-12-01" } as never,
        1,
      );

      expect(prisma.tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "A",
            created_by: 1,
            deadline: new Date("2026-12-01"),
          }),
        }),
      );
      expect(activityLog.create).toHaveBeenCalledWith(
        { task_id: 5, action: 'Task created: "A"' },
        1,
        false,
      );
      expect(prisma.task_members.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { task_id: 5, user_id: 1 } }),
      );
    });

    // THESIS: T32 (L1) – the activity-log write is not part of the task's transaction
    it("still returns the task when the activity-log write fails", async () => {
      prisma.tasks.create.mockResolvedValue({ task_id: 5, title: "A" });
      activityLog.create.mockRejectedValue(new Error("log down"));

      await expect(service.create({ title: "A" } as never, 1)).resolves.toEqual(
        { task_id: 5, title: "A" },
      );
    });
  });

  describe("findAll", () => {
    it("shows all tasks to a teacher and uses the DB count as total", async () => {
      asStaff(true);
      prisma.tasks.findMany.mockResolvedValue([{ task_id: 1, status: "OPEN" }]);
      prisma.tasks.count.mockResolvedValue(42);

      const result = await service.findAll({}, 7);

      expect(firstFindManyWhere()).toEqual({});
      expect(result.meta).toEqual({
        total: 42,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
      expect(result.data).toHaveLength(1);
    });

    it("limits a student to created, assigned or member tasks", async () => {
      asStaff(false);

      await service.findAll({}, 7);

      expect(firstFindManyWhere()).toEqual({
        AND: [
          {
            OR: [
              { created_by: 7 },
              { assigned_to: 7 },
              { task_members: { some: { user_id: 7 } } },
            ],
          },
        ],
      });
    });

    // problem 4 (fixed in M7): one role query per request, through PermissionsService.hasAnyRole
    it("looks up the user's roles once per request", async () => {
      asStaff(false);

      await service.findAll({}, 7);

      expect(prisma.user_roles.count).toHaveBeenCalledTimes(1);
      expect(prisma.user_roles.findMany).not.toHaveBeenCalled();
    });

    // BUG (decision B3, fixed in M17): a student's page also contains all descendants
    // of the page's tasks, and meta.total counts only this merged list.
    it("adds all descendants of a student page and counts only the merged list", async () => {
      asStaff(false);
      prisma.tasks.count.mockResolvedValue(1);
      prisma.tasks.findMany.mockImplementation((args: FindManyArgs) => {
        const parent = args.where?.parent_task_id;
        if (parent && typeof parent === "object" && parent.in) {
          const children: Record<
            number,
            Array<{ task_id: number; status: string }>
          > = {
            1: [{ task_id: 2, status: "OPEN" }],
            2: [{ task_id: 3, status: "OPEN" }],
          };
          return Promise.resolve(parent.in.flatMap((id) => children[id] ?? []));
        }
        return Promise.resolve([{ task_id: 1, status: "OPEN" }]);
      });

      const result = await service.findAll({ limit: 1 }, 7);

      expect(result.data.map((task) => task.task_id)).toEqual([1, 2, 3]);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(3);
    });

    // problem 1 (fixed in M7): search and visibility are combined with AND
    it("applies the search term for students within their visible tasks", async () => {
      asStaff(false);

      await service.findAll({ search: "mathe" }, 7);

      const where = firstFindManyWhere();
      expect(where.AND).toEqual([
        {
          OR: [
            { title: { contains: "mathe", mode: "insensitive" } },
            { description: { contains: "mathe", mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { created_by: 7 },
            { assigned_to: 7 },
            { task_members: { some: { user_id: 7 } } },
          ],
        },
      ]);
    });

    it("applies the search term for teachers", async () => {
      asStaff(true);

      await service.findAll({ search: "mathe" }, 7);

      expect(firstFindManyWhere().AND).toEqual([
        {
          OR: [
            { title: { contains: "mathe", mode: "insensitive" } },
            { description: { contains: "mathe", mode: "insensitive" } },
          ],
        },
      ]);
    });

    it("applies the filters, maps parent_task_id 0 to top-level tasks and pages", async () => {
      await service.findAll({
        status: "OPEN",
        priority_id: 2,
        assigned_to: 3,
        created_by: 4,
        parent_task_id: 0,
        page: 3,
        limit: 10,
      } as never);

      expect(prisma.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "OPEN",
            priority_id: 2,
            assigned_to: 3,
            created_by: 4,
            parent_task_id: null,
          },
          skip: 20,
          take: 10,
        }),
      );
      // without a user there is no role lookup and no visibility filter
      expect(prisma.user_roles.count).not.toHaveBeenCalled();
    });
  });

  describe("findOne and the read-time recalculation (T119)", () => {
    it("throws 404 when the task does not exist", async () => {
      prisma.tasks.findUnique.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it("skips the recalculation for a task that is already COMPLETED", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        status: "COMPLETED",
      });

      await service.findOne(1, false);

      expect(prisma.task_members.findMany).not.toHaveBeenCalled();
      expect(prisma.tasks.update).not.toHaveBeenCalled();
    });

    it("does not complete a task whose participants are not students", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        status: "OPEN",
        created_by: 5,
      });
      prisma.users.findMany.mockResolvedValue([
        { user_id: 5, students: null, user_roles: teacherRoles },
      ]);

      await service.findOne(1, false);

      expect(prisma.documents.findMany).not.toHaveBeenCalled();
      expect(prisma.tasks.update).not.toHaveBeenCalled();
    });

    it("does not complete a task while one student participant has no graded submission", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        status: "OPEN",
        created_by: 5,
        assigned_to: 6,
      });
      prisma.task_members.findMany.mockResolvedValue([{ user_id: 7 }]);
      prisma.users.findMany.mockResolvedValue([
        { user_id: 5, students: { student_id: 5 }, user_roles: [] },
        { user_id: 6, students: null, user_roles: studentRoles },
        { user_id: 7, students: { student_id: 7 }, user_roles: studentRoles },
      ]);
      prisma.documents.findMany.mockResolvedValue([
        { added_by: 5 },
        { added_by: 6 },
      ]);

      await service.findOne(1, false);

      expect(prisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: { in: [5, 6, 7] } } }),
      );
      expect(prisma.tasks.update).not.toHaveBeenCalled();
    });

    it("recalculates task status in findOne when every student participant is graded", async () => {
      prisma.tasks.findUnique
        .mockResolvedValueOnce({
          task_id: 1,
          status: "IN_PROGRESS",
          created_by: 5,
        })
        .mockResolvedValueOnce({
          task_id: 1,
          status: "COMPLETED",
          progress: 100,
          created_by: 5,
        });
      prisma.users.findMany.mockResolvedValue([
        { user_id: 5, students: null, user_roles: studentRoles },
      ]);
      prisma.documents.findMany.mockResolvedValue([{ added_by: 5 }]);

      const result = await service.findOne(1);

      expect(prisma.tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { task_id: 1 },
          data: expect.objectContaining({ status: "COMPLETED", progress: 100 }),
        }),
      );
      expect(result.status).toBe("COMPLETED");
    });
  });

  describe("findOneForStudent", () => {
    it("locks the task for the student once one of their submissions is graded", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        status: "COMPLETED",
      });
      prisma.documents.findMany.mockResolvedValue([
        { document_id: 1, graded_at: null, grade: null, feedback: null },
        { document_id: 2, graded_at: new Date(), grade: "2", feedback: "gut" },
      ]);

      const result = await service.findOneForStudent(1, 7, false);

      expect(result.student_submission_status).toEqual({
        has_submitted: true,
        has_graded_submission: true,
        submission_count: 2,
        latest_grade: "2",
      });
      expect(result.is_student_submission_locked).toBe(true);
    });
  });

  describe("findeOneWithSubtasks / buildTree", () => {
    it("throws 404 for an unknown root task", async () => {
      prisma.tasks.findUnique.mockResolvedValue(null);
      await expect(service.findeOneWithSubtasks(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("builds the tree from all tasks of the root task's creator", async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 1, created_by: 5 });
      prisma.tasks.findMany.mockResolvedValue([
        { task_id: 1, parent_task_id: null },
        { task_id: 2, parent_task_id: 1 },
        { task_id: 3, parent_task_id: 2 },
        { task_id: 4, parent_task_id: null },
      ]);

      const tree = (await service.findeOneWithSubtasks(1, false)) as {
        task_id: number;
        subtasks: Array<{
          task_id: number;
          subtasks: Array<{ task_id: number }>;
        }>;
      };

      expect(prisma.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { created_by: 5 } }),
      );
      expect(tree.task_id).toBe(1);
      expect(tree.subtasks.map((task) => task.task_id)).toEqual([2]);
      expect(tree.subtasks[0].subtasks.map((task) => task.task_id)).toEqual([
        3,
      ]);
    });
  });

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
          data: expect.objectContaining({ parent_task_id: 4 }),
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
        prisma.tasks.update.mock.calls[0][0] as {
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

    // THESIS: T32 (L1) – the task update is kept although the activity-log write failed
    it("keeps the update when the activity-log write fails", async () => {
      activityLog.create.mockRejectedValue(new Error("log down"));
      await expect(service.update(1, { title: "neu" }, 5)).resolves.toEqual(
        expect.objectContaining({ title: "neu" }),
      );
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
        where: { completion_rule: { not: expect.anything() } },
      });
    });
  });

  describe("updateDeadlineAndUnlockIfNeeded", () => {
    it("sets the new deadline, unlocks the task and logs it", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        status: "COMPLETED",
        created_by: 5,
      });
      prisma.tasks.update.mockResolvedValue({ task_id: 1 });
      const deadline = new Date("2026-12-24T10:00:00Z");

      await service.updateDeadlineAndUnlockIfNeeded(1, deadline, 5);

      expect(prisma.tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deadline,
            is_locked: false,
            locked_reason: null,
            locked_until: null,
          }),
        }),
      );
      expect(activityLog.create).toHaveBeenCalledWith(
        {
          task_id: 1,
          action: "Task deadline updated to 2026-12-24 and unlocked",
        },
        5,
        false,
      );
    });

    // M7: the route had no check at all; now staff or the task's creator (TaskForm offers it to creators)
    it("lets staff change the deadline of someone else's task", async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 1, created_by: 5 });
      prisma.tasks.update.mockResolvedValue({ task_id: 1 });
      asStaff(true);

      await service.updateDeadlineAndUnlockIfNeeded(1, new Date(), 9);

      expect(prisma.tasks.update).toHaveBeenCalled();
    });

    it("rejects anyone else with 403 and changes nothing", async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 1, created_by: 5 });
      asStaff(false);

      await expect(
        service.updateDeadlineAndUnlockIfNeeded(1, new Date(), 9),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.tasks.update).not.toHaveBeenCalled();
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

    // THESIS: T32 – the task's activity-log entries are deleted with it, and the delete itself is not logged
    it("lets the creator delete without a permission check and removes dependent rows in one transaction", async () => {
      const result = await service.remove(1, 5);

      expect(prisma.user_permissions.findFirst).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.task_activity_log.deleteMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(prisma.task_comments.deleteMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(prisma.task_documents.deleteMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(prisma.comments.updateMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
        data: { task_id: null },
      });
      expect(prisma.chat_rooms.updateMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
        data: { task_id: null },
      });
      expect(prisma.tasks.delete).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
      expect(activityLog.create).not.toHaveBeenCalled();
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
          data: expect.objectContaining({ parent_task_id: 1, created_by: 5 }),
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
          data: expect.objectContaining({ parent_task_id: 1 }),
        }),
      );
    });

    // BUG (M15): the own-parent check in changeTaskParent (tasks.service.ts:588-590) is dead code,
    // because validateNoCircularReference throws first; update() checks it first and gives a different error
    it("reports a task as its own parent as a circular reference, unlike update()", async () => {
      await expect(service.changeTaskParent(1, 1)).rejects.toThrow(
        "Circular reference detected",
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

    it("returns comments oldest first and the activity log newest first", async () => {
      await service.getComments(1);
      await service.getActivityLog(1);
      expect(prisma.task_comments.findMany).toHaveBeenCalledWith(
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

  describe("checkAndAutoComplete", () => {
    const rule = {
      type: "operator",
      operator: "AND",
      operands: [
        { type: "leaf", task_id: "2" },
        { type: "leaf", task_id: "3" },
      ],
    };

    const mockParents = (
      parent: Record<string, unknown>,
      completedChildren: number[],
    ) => {
      prisma.tasks.findMany.mockImplementation((args: FindManyArgs) =>
        Promise.resolve(
          args.where?.completion_rule !== undefined
            ? [
                parent,
                {
                  task_id: 50,
                  auto_complete: true,
                  completion_rule: { type: "leaf", task_id: "99" },
                },
              ]
            : completedChildren.map((task_id) => ({ task_id })),
        ),
      );
      prisma.tasks.update.mockImplementation(
        (args: { data: Record<string, unknown> }) =>
          Promise.resolve({ task_id: 1, ...args.data }),
      );
    };

    // THESIS: T107 – only creator and assignee get the realtime update, task members don't
    it("completes the parent when its rule is fulfilled and notifies assignee and creator", async () => {
      mockParents(
        {
          task_id: 1,
          auto_complete: true,
          status: "IN_PROGRESS",
          completion_rule: rule,
          assigned_to: 10,
          created_by: 11,
        },
        [2, 3],
      );

      await service.checkAndAutoComplete(2);

      expect(prisma.tasks.update).toHaveBeenCalledTimes(1);
      expect(prisma.tasks.update).toHaveBeenCalledWith({
        where: { task_id: 1 },
        data: { status: "COMPLETED", progress: 100 },
      });
      expect(
        gateway.emitTaskUpdated.mock.calls.map((call: unknown[]) => call[0]),
      ).toEqual([10, 11]);
    });

    it("reopens a COMPLETED parent when the rule is no longer fulfilled", async () => {
      mockParents(
        {
          task_id: 1,
          auto_complete: true,
          status: "COMPLETED",
          completion_rule: rule,
          assigned_to: 10,
          created_by: 10,
        },
        [2],
      );

      await service.checkAndAutoComplete(2);

      expect(prisma.tasks.update).toHaveBeenCalledWith({
        where: { task_id: 1 },
        data: { status: "IN_PROGRESS" },
      });
      // creator and assignee are the same user, so one notification
      expect(gateway.emitTaskUpdated).toHaveBeenCalledTimes(1);
    });

    it("ignores parents without auto_complete", async () => {
      mockParents(
        {
          task_id: 1,
          auto_complete: false,
          status: "IN_PROGRESS",
          completion_rule: rule,
        },
        [2, 3],
      );

      await service.checkAndAutoComplete(2);

      expect(prisma.tasks.update).not.toHaveBeenCalled();
    });
  });

  describe("locking", () => {
    it("locks an overdue task for 7 days and notifies the assignee", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        assigned_to: 10,
      });

      await service.lockOverdueTask(1);

      expect(prisma.tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            is_locked: true,
            locked_reason: "OVERDUE",
          }),
        }),
      );
      expect(gateway.emitTaskLocked).toHaveBeenCalledWith(10, 1, "OVERDUE");
    });

    it("throws 404 when locking an unknown overdue task", async () => {
      prisma.tasks.findUnique.mockResolvedValue(null);
      await expect(service.lockOverdueTask(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lets only the creator lock and unlock a task", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        created_by: 5,
        assigned_to: null,
      });

      await expect(service.lockTask(1, "MANUAL", 6)).rejects.toThrow(
        "Only task creator can lock this task",
      );
      await expect(service.unlockTask(1, 6)).rejects.toThrow(
        "Only task creator can unlock this task",
      );

      await service.lockTask(1, "MANUAL", 5);
      await service.unlockTask(1, 5);
      expect(prisma.tasks.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: { is_locked: false, locked_reason: null, locked_until: null },
        }),
      );
      expect(gateway.emitTaskLocked).not.toHaveBeenCalled();
    });

    it("allows editing only for the creator of an unlocked task", async () => {
      prisma.tasks.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ task_id: 1, is_locked: true, created_by: 5 })
        .mockResolvedValueOnce({ task_id: 1, is_locked: false, created_by: 5 })
        .mockResolvedValueOnce({ task_id: 1, is_locked: false, created_by: 5 });

      await expect(service.canEditTask(1, 5)).resolves.toBe(false);
      await expect(service.canEditTask(1, 5)).resolves.toBe(false);
      await expect(service.canEditTask(1, 6)).resolves.toBe(false);
      await expect(service.canEditTask(1, 5)).resolves.toBe(true);
    });
  });
});
