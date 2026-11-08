import { TaskCompletionService } from "./task-completion.service";
import { TaskNotificationsService } from "./task-notifications.service";
import { TaskRealtime } from "./ports/task-realtime";
import { TaskRepository } from "./ports/task.repository";

// M17 review: a grade that completes a task is a status change like any
// other: the parents' rules are re-checked, and the people involved hear of it
describe("TaskCompletionService.completeAfterGrading", () => {
  let tasks: Record<string, jest.Mock>;
  let realtime: { emitTaskUpdated: jest.Mock };
  let notifications: { statusChanged: jest.Mock };
  let service: TaskCompletionService;

  beforeEach(() => {
    tasks = {
      findCompletionSnapshots: jest.fn().mockResolvedValue([
        { task_id: 2, status: "IN_PROGRESS", created_by: 4, assigned_to: 21 },
        { task_id: 3, status: "IN_PROGRESS", created_by: 4, assigned_to: 22 },
      ]),
      findMembersOf: jest.fn().mockResolvedValue([]),
      findParticipantProfiles: jest.fn().mockResolvedValue([
        { user_id: 21, students: { student_id: 21 }, user_roles: [] },
        { user_id: 22, students: { student_id: 22 }, user_roles: [] },
      ]),
      // only task 2's student is graded
      findGradedSubmissions: jest
        .fn()
        .mockResolvedValue([{ added_by: 21, taskIds: [2] }]),
      completeTasks: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({
        task_id: 2,
        title: "Abgabe",
        status: "COMPLETED",
        created_by: 4,
        assigned_to: 21,
      }),
      // parent 1's rule waits for subtask 2
      findWithCompletionRule: jest.fn().mockResolvedValue([
        {
          task_id: 1,
          auto_complete: true,
          status: "IN_PROGRESS",
          created_by: 4,
          assigned_to: null,
          completion_rule: { type: "leaf", task_id: "2" },
        },
      ]),
      findCompletedChildIds: jest.fn().mockResolvedValue([2]),
      updateRow: jest.fn().mockResolvedValue({
        task_id: 1,
        title: "Projekt",
        status: "COMPLETED",
        created_by: 4,
        assigned_to: null,
      }),
      findMemberIds: jest.fn().mockResolvedValue([]),
    };
    realtime = { emitTaskUpdated: jest.fn() };
    notifications = { statusChanged: jest.fn().mockResolvedValue(undefined) };
    service = new TaskCompletionService(
      tasks as unknown as TaskRepository,
      realtime as unknown as TaskRealtime,
      notifications as unknown as TaskNotificationsService,
    );
  });

  it("loads the tasks in one query and completes the graded ones in one update", async () => {
    await service.completeAfterGrading([2, 3]);

    expect(tasks.findCompletionSnapshots).toHaveBeenCalledWith([2, 3]);
    expect(tasks.completeTasks).toHaveBeenCalledWith([2]);
  });

  it("completes the parent whose rule now holds and notifies about both", async () => {
    await service.completeAfterGrading([2, 3]);

    expect(tasks.updateRow).toHaveBeenCalledWith(1, {
      status: "COMPLETED",
      progress: 100,
    });
    expect(realtime.emitTaskUpdated).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ task_id: 1 }),
    );
    expect(
      notifications.statusChanged.mock.calls.map(
        ([task]) => (task as { task_id: number }).task_id,
      ),
    ).toEqual([2, 1]);
  });

  it("does nothing when no task was completed", async () => {
    tasks.findGradedSubmissions.mockResolvedValue([]);

    await service.completeAfterGrading([2, 3]);

    expect(tasks.completeTasks).not.toHaveBeenCalled();
    expect(notifications.statusChanged).not.toHaveBeenCalled();
  });
});
