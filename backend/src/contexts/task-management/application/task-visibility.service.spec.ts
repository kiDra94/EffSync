import {
  PermissionsService,
  PRIVILEGED_ROLES,
} from "../../identity-access/application";
import { TaskRepository } from "./ports/task.repository";
import { TaskVisibilityService } from "./task-visibility.service";

// decision B3 (M17), changed by I5 (M38): Admin and Superuser see every
// task; anyone else, teachers included, a task they or one of its ancestors'
// people include them in
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

  it("gives Admin and Superuser every task without a visibility query", async () => {
    permissions.hasAnyRole.mockResolvedValue(true);

    await expect(service.scopeFor(1)).resolves.toEqual({ all: true });
    await expect(service.isVisible(99, 1)).resolves.toBe(true);
    expect(tasks.isVisibleTo).not.toHaveBeenCalled();
    expect(permissions.hasAnyRole).toHaveBeenCalledWith(1, PRIVILEGED_ROLES);
  });

  // THESIS: T128 (decision I5, M38) – a student may use the app privately, so
  // a teacher sees only the tasks they are part of
  it("gives a teacher the visible set, like a student", async () => {
    permissions.hasAnyRole.mockImplementation(
      (_id: number, roles: readonly string[]) =>
        Promise.resolve(roles.includes("Teacher")),
    );

    await expect(service.scopeFor(2)).resolves.toEqual({ viewerId: 2 });
    await expect(service.isVisible(99, 2)).resolves.toBe(false);
    expect(tasks.isVisibleTo).toHaveBeenCalledWith(99, 2);
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
