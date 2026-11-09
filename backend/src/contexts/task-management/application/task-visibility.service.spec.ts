import { PermissionsService } from "../../identity-access/application";
import { TaskRepository } from "./ports/task.repository";
import { TaskVisibilityService } from "./task-visibility.service";

// decision B3 (M17): staff see every task; a student a task they or one of
// its ancestors' people include them in
describe("TaskVisibilityService", () => {
  let tasks: { isVisibleTo: jest.Mock };
  let permissions: { hasAnyRole: jest.Mock };
  let service: TaskVisibilityService;

  beforeEach(() => {
    tasks = {
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

    await expect(service.scopeFor(2)).resolves.toEqual({ all: true });
    await expect(service.isVisible(99, 2)).resolves.toBe(true);
    expect(tasks.isVisibleTo).not.toHaveBeenCalled();
  });

  it("checks one task for a student with the targeted query", async () => {
    tasks.isVisibleTo.mockResolvedValueOnce(true);

    await expect(service.isVisible(12, 7)).resolves.toBe(true);
    await expect(service.isVisible(13, 7)).resolves.toBe(false);
    expect(tasks.isVisibleTo).toHaveBeenCalledWith(12, 7);
  });

  // M37: the visible set stays a query inside the database
  it("scopes GET /tasks to a student's visible set by their id", async () => {
    await expect(service.scopeFor(7)).resolves.toEqual({ viewerId: 7 });
  });

  it("scopes a request without a user to all tasks, as before", async () => {
    await expect(service.scopeFor(undefined)).resolves.toEqual({ all: true });
    expect(permissions.hasAnyRole).not.toHaveBeenCalled();
  });
});
