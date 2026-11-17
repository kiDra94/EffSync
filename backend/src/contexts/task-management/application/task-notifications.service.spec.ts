import { Notifier } from "../../notifications/application";
import { TaskRepository } from "./ports/task.repository";
import { TaskNotificationsService } from "./task-notifications.service";

// T44, T72 (M16): who gets which notification about a task. The actor and
// the ghost user (M14) never get one.
describe("TaskNotificationsService", () => {
  const task = {
    task_id: 3,
    title: "Referat",
    status: "IN_REVIEW",
    created_by: 2,
    assigned_to: 4,
  };
  let notifier: { notify: jest.Mock };
  let tasks: { findMemberIds: jest.Mock };
  let service: TaskNotificationsService;

  beforeEach(() => {
    notifier = { notify: jest.fn().mockResolvedValue(undefined) };
    tasks = { findMemberIds: jest.fn().mockResolvedValue([2, 5, 0]) };
    service = new TaskNotificationsService(
      notifier as unknown as Notifier,
      tasks as unknown as TaskRepository,
    );
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  const recipients = () =>
    notifier.notify.mock.calls.map(
      ([request]: [{ userId: number }]) => request.userId,
    );

  it("tells the assignee about the assignment", async () => {
    await service.taskAssigned(task, 2);

    expect(notifier.notify).toHaveBeenCalledWith({
      userId: 4,
      type: "task_assigned",
      text: 'Dir wurde die Aufgabe "Referat" zugewiesen.',
    });
  });

  it("sends nothing when users assign tasks to themselves or to the ghost user", async () => {
    await service.taskAssigned({ ...task, assigned_to: 2 }, 2);
    await service.taskAssigned({ ...task, assigned_to: 0 }, 2);
    await service.taskAssigned({ ...task, assigned_to: null }, 2);

    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it("tells everyone involved about a status change, except the actor and the ghost", async () => {
    await service.statusChanged(task, 4);

    expect(recipients()).toEqual([2, 5]);
    expect(notifier.notify).toHaveBeenCalledWith({
      userId: 2,
      type: "task_status_changed",
      text: 'Status von "Referat": IN_REVIEW',
    });
  });

  it("tells a user they were added to or removed from a task", async () => {
    await service.memberAdded(task, 5, 2);
    await service.memberRemoved(task, 5, 2);

    expect(notifier.notify.mock.calls).toEqual([
      [
        {
          userId: 5,
          type: "task_member_added",
          text: 'Du wurdest zur Aufgabe "Referat" hinzugefügt.',
        },
      ],
      [
        {
          userId: 5,
          type: "task_member_removed",
          text: 'Du wurdest aus der Aufgabe "Referat" entfernt.',
        },
      ],
    ]);
  });

  it("doesn't fail the use case when a notification can't be sent", async () => {
    notifier.notify.mockRejectedValue(new Error("down"));

    await expect(service.statusChanged(task, 4)).resolves.toBeUndefined();
  });

  // review M16 (8): one recipient's notification doesn't wait for the other's
  it("sends to all recipients at once", async () => {
    let started = 0;
    notifier.notify.mockImplementation(() => {
      started += 1;
      return new Promise((resolve) => setTimeout(resolve, 20));
    });

    const sending = service.statusChanged(task, 4);
    await new Promise((resolve) => setImmediate(resolve));
    expect(started).toBe(2);
    await sending;
  });
});
