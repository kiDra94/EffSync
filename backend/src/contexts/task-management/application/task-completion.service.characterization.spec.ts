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
});
