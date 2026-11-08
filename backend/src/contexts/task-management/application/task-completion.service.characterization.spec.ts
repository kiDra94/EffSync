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
import { TaskCompletionService } from "./task-completion.service";
import {
  createPrismaMock,
  createTaskServices,
  FindManyArgs,
  PrismaMock,
  studentRoles,
  teacherRoles,
} from "./task.characterization.fixtures";

describe("TaskCompletionService (characterization, M1)", () => {
  let prisma: PrismaMock;
  let gateway: { emitTaskUpdated: jest.Mock; emitTaskLocked: jest.Mock };
  let activityLog: { create: jest.Mock };
  let service: TaskCompletionService;

  beforeEach(() => {
    prisma = createPrismaMock();
    gateway = { emitTaskUpdated: jest.fn(), emitTaskLocked: jest.fn() };
    activityLog = { create: jest.fn() };
    service = createTaskServices(prisma, gateway, activityLog).completion;
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

    // THESIS: T107 (flipped in M16) – creator, assignee and the members get the realtime update
    it("completes the parent when its rule is fulfilled and notifies assignee, creator and members", async () => {
      prisma.task_members.findMany.mockResolvedValue([
        { user_id: 12 },
        { user_id: 10 },
      ]);
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
      ).toEqual([11, 10, 12]);
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

  // problems 2 and 3 (M17): one implementation for grading and the read paths,
  // with the same four queries for any number of tasks
  it("completes the graded tasks of a list in four queries", async () => {
    prisma.task_members.findMany.mockResolvedValue([
      { task_id: 1, user_id: 21 },
      { task_id: 2, user_id: 22 },
    ]);
    prisma.users.findMany.mockResolvedValue([
      { user_id: 21, students: { student_id: 21 }, user_roles: [] },
      { user_id: 22, students: { student_id: 22 }, user_roles: [] },
    ]);
    prisma.documents.findMany.mockResolvedValue([
      { added_by: 21, task_documents: [{ task_id: 1 }] },
      { added_by: 22, task_documents: [{ task_id: 3 }] },
    ]);
    prisma.tasks.updateMany.mockResolvedValue({ count: 1 });

    const completed = await service.completeIfAllStudentsGraded([
      { task_id: 1, status: "IN_PROGRESS", created_by: 4, assigned_to: null },
      { task_id: 2, status: "IN_PROGRESS", created_by: 4, assigned_to: null },
      { task_id: 3, status: "COMPLETED", created_by: 4, assigned_to: 22 },
    ]);

    // task 1: its student 21 is graded; task 2: student 22 only for task 3
    expect([...completed]).toEqual([1]);
    expect(prisma.task_members.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.users.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.documents.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.tasks.updateMany).toHaveBeenCalledWith({
      where: { task_id: { in: [1] } },
      data: expect.objectContaining({
        status: "COMPLETED",
        progress: 100,
      }) as unknown,
    });
  });
});
