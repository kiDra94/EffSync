import { ExecutionContext, NotFoundException } from "@nestjs/common";
import { TaskVisibilityService } from "../application/task-visibility.service";
import { TaskVisibilityGuard } from "./task-visibility.guard";

// M17 review: every /tasks/:id… route is checked in one place, so a new route
// can't forget it; an invisible task is a 404
describe("TaskVisibilityGuard", () => {
  const contextFor = (params: object, userId = 7) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params, user: { userId } }),
      }),
    }) as unknown as ExecutionContext;

  let visibility: { isVisible: jest.Mock };
  let guard: TaskVisibilityGuard;

  beforeEach(() => {
    visibility = { isVisible: jest.fn().mockResolvedValue(true) };
    guard = new TaskVisibilityGuard(
      visibility as unknown as TaskVisibilityService,
    );
  });

  it("lets routes without a task id through unchecked", async () => {
    await expect(guard.canActivate(contextFor({}))).resolves.toBe(true);
    await expect(
      guard.canActivate(contextFor({ templateId: "3" })),
    ).resolves.toBe(true);
    expect(visibility.isVisible).not.toHaveBeenCalled();
  });

  it("checks the task of an :id route for the requester", async () => {
    await expect(guard.canActivate(contextFor({ id: "12" }))).resolves.toBe(
      true,
    );
    expect(visibility.isVisible).toHaveBeenCalledWith(12, 7);
  });

  it("answers 404 for a task the requester can't see", async () => {
    visibility.isVisible.mockResolvedValue(false);

    await expect(guard.canActivate(contextFor({ id: "12" }))).rejects.toThrow(
      NotFoundException,
    );
  });

  it("leaves a non-numeric id to ParseIntPipe (400)", async () => {
    await expect(guard.canActivate(contextFor({ id: "abc" }))).resolves.toBe(
      true,
    );
    expect(visibility.isVisible).not.toHaveBeenCalled();
  });
});
