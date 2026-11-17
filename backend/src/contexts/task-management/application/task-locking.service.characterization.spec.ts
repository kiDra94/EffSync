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
import { TaskLockingService } from "./task-locking.service";
import {
  createPrismaMock,
  createTaskServices,
  FindManyArgs,
  PrismaMock,
  studentRoles,
  teacherRoles,
} from "./task.characterization.fixtures";

describe("TaskLockingService (characterization, M1)", () => {
  let prisma: PrismaMock;
  let gateway: { emitTaskUpdated: jest.Mock; emitTaskLocked: jest.Mock };
  let activityLog: { create: jest.Mock };
  let service: TaskLockingService;

  beforeEach(() => {
    prisma = createPrismaMock();
    gateway = { emitTaskUpdated: jest.fn(), emitTaskLocked: jest.fn() };
    activityLog = { create: jest.fn() };
    service = createTaskServices(prisma, gateway, activityLog).locking;
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
          }) as unknown,
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
          }) as unknown,
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
