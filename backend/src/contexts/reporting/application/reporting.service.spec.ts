import type { TaskVisibilityService } from "../../task-management/application";
import type { ReportingRepository } from "./ports/reporting.repository";
import { ReportingService } from "./reporting.service";

// FA-30 to FA-35 (M24): the dashboard metrics
describe("ReportingService", () => {
  let repo: Record<string, jest.Mock>;
  let visibility: { visibleIdsFor: jest.Mock };
  let service: ReportingService;
  const STUDENT = { userId: 4, role: "student" };
  const ADMIN = { userId: 1, role: "admin" };

  beforeEach(() => {
    repo = {
      findTasks: jest.fn().mockResolvedValue([]),
      findActiveProjects: jest.fn().mockResolvedValue([]),
      countSubtrees: jest.fn().mockResolvedValue(new Map()),
      findTopAssignees: jest.fn().mockResolvedValue([]),
      findTrendRows: jest.fn().mockResolvedValue([]),
    };
    // staff see everything (undefined), others their visible set (decision B3)
    visibility = {
      visibleIdsFor: jest.fn((userId: number) =>
        Promise.resolve(userId === 1 ? undefined : [7, 8]),
      ),
    };
    service = new ReportingService(
      repo as unknown as ReportingRepository,
      visibility as unknown as TaskVisibilityService,
    );
  });

  // review M24: the dashboard counts the tasks the task list shows
  it("counts the user's visible set, all tasks for staff, none without a user", async () => {
    await service.getTaskProgress(STUDENT);
    await service.getTaskProgress(ADMIN);
    await service.getTaskProgress({});

    expect(visibility.visibleIdsFor).toHaveBeenCalledWith(4);
    expect(repo.findTasks).toHaveBeenNthCalledWith(1, { taskIds: [7, 8] });
    expect(repo.findTasks).toHaveBeenNthCalledWith(2, { all: true });
    expect(repo.findTasks).toHaveBeenNthCalledWith(3, { taskIds: [] });
  });

  it("counts total, open, completed and overdue tasks (FA-31)", async () => {
    repo.findTasks.mockResolvedValue([
      { status: "COMPLETED", deadline: null, progress: 100 },
      { status: "TODO", deadline: new Date("2020-01-01"), progress: 0 },
      { status: "IN_PROGRESS", deadline: null, progress: 50 },
    ]);

    await expect(service.getTaskProgress(STUDENT)).resolves.toMatchObject({
      totalTasks: 3,
      completedTasks: 1,
      openTasks: 2,
      overtasks: 1,
      averageProgress: 50,
    });
  });

  it("puts overdue tasks into their own donut slice (FA-32)", async () => {
    repo.findTasks.mockResolvedValue([
      { status: "TODO", deadline: new Date("2020-01-01") },
      { status: "TODO", deadline: null },
      { status: "COMPLETED", deadline: new Date("2020-01-01") },
    ]);

    const distribution = await service.getStatusDistribution(STUDENT);
    expect(distribution.labels.at(-1)).toBe("Überfällig");
    expect(distribution.data).toEqual([1, 0, 0, 1, 0, 1]);
  });

  it("lists active projects with the progress of their subtree (FA-30, FA-34)", async () => {
    repo.findActiveProjects.mockResolvedValue([
      { task_id: 1, title: "Projekt", deadline: null, progress: 0 },
      { task_id: 2, title: "Ohne Subtasks", deadline: null, progress: 30 },
    ]);
    repo.countSubtrees.mockResolvedValue(
      new Map([[1, { total: 4, completed: 3 }]]),
    );

    await expect(service.getActiveProjects(STUDENT)).resolves.toEqual([
      {
        task_id: 1,
        title: "Projekt",
        deadline: null,
        subtask_count: 4,
        progress: 75,
      },
      {
        task_id: 2,
        title: "Ohne Subtasks",
        deadline: null,
        subtask_count: 0,
        progress: 30,
      },
    ]);
    expect(repo.countSubtrees).toHaveBeenCalledWith([1, 2]);
  });

  it("asks for the five members with the most completed tasks (FA-35)", async () => {
    await service.getTopMembers(ADMIN);

    expect(repo.findTopAssignees).toHaveBeenCalledWith({ all: true }, 5);
  });

  it("builds 8 weeks or 6 months of trends from created and completed tasks (FA-33)", async () => {
    const now = new Date("2026-11-11T10:00:00");
    repo.findTrendRows.mockResolvedValue([
      {
        created_at: new Date("2026-11-10T08:00:00"),
        updated_at: new Date("2026-11-10T09:00:00"),
        status: "COMPLETED",
      },
      {
        created_at: new Date("2026-11-10T08:00:00"),
        updated_at: new Date("2026-11-11T09:00:00"),
        status: "TODO",
      },
    ]);

    const weeks = await service.getTrends(STUDENT, "week", now);
    expect(weeks.labels).toHaveLength(8);
    expect(weeks.created.at(-1)).toBe(2);
    // only a completed task counts as completed, on its last change
    expect(weeks.completed.at(-1)).toBe(1);

    const months = await service.getTrends(STUDENT, "month", now);
    expect(months.labels).toHaveLength(6);
    expect(months.labels.at(-1)).toBe("Nov 2026");
  });
});
