import { PermissionsService } from "../../identity-access/application";
import { TaskRepository } from "./ports/task.repository";
import { TaskVisibilityService } from "./task-visibility.service";

// decision B3 (M17): staff see every task; a student a task they or one of
// its ancestors' people include them in
describe("TaskVisibilityService", () => {
  let tasks: { findVisibleTaskIds: jest.Mock; isVisibleTo: jest.Mock };
  let permissions: { hasAnyRole: jest.Mock };
  let service: TaskVisibilityService;

  beforeEach(() => {
    tasks = {
      findVisibleTaskIds: jest.fn().mockResolvedValue([1, 2]),
      isVisibleTo: jest.fn().mockResolvedValue(false),
    };
    permissions = { hasAnyRole: jest.fn().mockResolvedValue(false) };
    service = new TaskVisibilityService(
      tasks as unknown as TaskRepository,
      permissions as unknown as PermissionsService,
    );
  });

  it("gives staff every task without a visibility query", async () => {
    permissions.hasAnyRole.mockResolvedValue(true);

    await expect(service.visibleIdsFor(2)).resolves.toBeUndefined();
    await expect(service.isVisible(99, 2)).resolves.toBe(true);
    expect(tasks.findVisibleTaskIds).not.toHaveBeenCalled();
    expect(tasks.isVisibleTo).not.toHaveBeenCalled();
  });

  it("checks one task for a student with the targeted query", async () => {
    tasks.isVisibleTo.mockResolvedValueOnce(true);

    await expect(service.isVisible(12, 7)).resolves.toBe(true);
    await expect(service.isVisible(13, 7)).resolves.toBe(false);
    expect(tasks.isVisibleTo).toHaveBeenCalledWith(12, 7);
    expect(tasks.findVisibleTaskIds).not.toHaveBeenCalled();
  });

  it("lists a student's visible set for GET /tasks", async () => {
    await expect(service.visibleIdsFor(7)).resolves.toEqual([1, 2]);
  });
});
