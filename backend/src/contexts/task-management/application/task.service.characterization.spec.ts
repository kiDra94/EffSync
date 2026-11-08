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

describe("TaskService: create and read (characterization, M1)", () => {
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
          }) as unknown,
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

    // THESIS: T32 (L1, flipped in M15) – the activity-log write is part of the task's
    // transaction: it fails inside $transaction, so the created task is rolled back
    it("fails the create inside its transaction when the activity-log write fails", async () => {
      prisma.tasks.create.mockResolvedValue({ task_id: 5, title: "A" });
      activityLog.create.mockRejectedValue(new Error("log down"));

      await expect(service.create({ title: "A" } as never, 1)).rejects.toThrow(
        "log down",
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.task_members.upsert).not.toHaveBeenCalled();
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

    // decision B3 (M17): a student's list is their visible set (own, assigned and
    // member tasks plus all subtasks, one recursive query)
    it("limits a student to their visible set", async () => {
      asStaff(false);
      prisma.$queryRaw.mockResolvedValue([{ task_id: 3 }, { task_id: 4 }]);

      await service.findAll({}, 7);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(firstFindManyWhere()).toEqual({
        AND: [{ task_id: { in: [3, 4] } }],
      });
    });

    // problem 4 (fixed in M7): one role query per request, through PermissionsService.hasAnyRole
    it("looks up the user's roles once per request", async () => {
      asStaff(false);

      await service.findAll({}, 7);

      expect(prisma.user_roles.count).toHaveBeenCalledTimes(1);
      expect(prisma.user_roles.findMany).not.toHaveBeenCalled();
    });

    // BUG (decision B3, fixed in M17): a student's page held all descendants of the page's
    // tasks, and meta.total counted only this merged list. Now the visible set is paged and counted.
    it("pages and counts a student's visible set, subtasks included", async () => {
      asStaff(false);
      prisma.$queryRaw.mockResolvedValue([
        { task_id: 1 },
        { task_id: 2 },
        { task_id: 3 },
      ]);
      prisma.tasks.count.mockResolvedValue(3);
      prisma.tasks.findMany.mockResolvedValue([{ task_id: 1, status: "OPEN" }]);

      const result = await service.findAll({ limit: 1 }, 7);

      expect(result.data.map((task) => task.task_id)).toEqual([1]);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(3);
      expect(prisma.tasks.findMany).toHaveBeenCalledTimes(1);
    });

    // problem 1 (fixed in M7): search and visibility are combined with AND
    it("applies the search term for students within their visible tasks", async () => {
      asStaff(false);

      prisma.$queryRaw.mockResolvedValue([{ task_id: 3 }]);

      await service.findAll({ search: "mathe" }, 7);

      const where = firstFindManyWhere();
      expect(where.AND).toEqual([
        {
          OR: [
            { title: { contains: "mathe", mode: "insensitive" } },
            { description: { contains: "mathe", mode: "insensitive" } },
          ],
        },
        { task_id: { in: [3] } },
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
      expect(prisma.tasks.updateMany).not.toHaveBeenCalled();
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
      expect(prisma.tasks.updateMany).not.toHaveBeenCalled();
    });

    it("does not complete a task while one student participant has no graded submission", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 1,
        status: "OPEN",
        created_by: 5,
        assigned_to: 6,
      });
      prisma.task_members.findMany.mockResolvedValue([
        { task_id: 1, user_id: 7 },
      ]);
      prisma.users.findMany.mockResolvedValue([
        { user_id: 5, students: { student_id: 5 }, user_roles: [] },
        { user_id: 6, students: null, user_roles: studentRoles },
        { user_id: 7, students: { student_id: 7 }, user_roles: studentRoles },
      ]);
      prisma.documents.findMany.mockResolvedValue([
        { added_by: 5, task_documents: [{ task_id: 1 }] },
        { added_by: 6, task_documents: [{ task_id: 1 }] },
      ]);

      await service.findOne(1, false);

      expect(prisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: { in: [5, 6, 7] } } }),
      );
      expect(prisma.tasks.updateMany).not.toHaveBeenCalled();
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
      prisma.documents.findMany.mockResolvedValue([
        { added_by: 5, task_documents: [{ task_id: 1 }] },
      ]);

      const result = await service.findOne(1);

      // M17: one batched update for the completed tasks
      expect(prisma.tasks.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { task_id: { in: [1] } },
          data: expect.objectContaining({
            status: "COMPLETED",
            progress: 100,
          }) as unknown,
        }),
      );
      expect(result.status).toBe("COMPLETED");
    });
  });

  describe("findOneForStudent", () => {
    it("locks the task for the student once one of their submissions is graded", async () => {
      // M17: the task is in the student's visible set
      prisma.$queryRaw.mockResolvedValue([{ task_id: 1 }]);
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
});
