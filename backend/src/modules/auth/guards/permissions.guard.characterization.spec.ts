/**
 * Characterization tests for PermissionsGuard (GOALS.md M2).
 */
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import {
  PermissionFlag,
  PermissionsService,
} from "../../permissions/permissions.service";

describe("PermissionsGuard (characterization, M2)", () => {
  let reflector: { get: jest.Mock };
  let permissionsService: { hasAnyPermission: jest.Mock };
  let guard: PermissionsGuard;

  const contextFor = (user?: { id?: number }) =>
    ({
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    permissionsService = {
      hasAnyPermission: jest.fn().mockResolvedValue(true),
    };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );
  });

  it("allows the request when the handler has no @Permissions metadata", async () => {
    reflector.get.mockReturnValue(undefined);

    await expect(guard.canActivate(contextFor({ id: 5 }))).resolves.toBe(true);
    expect(permissionsService.hasAnyPermission).not.toHaveBeenCalled();
  });

  // THESIS: T54 – @Permissions() without arguments protects nothing beyond the JWT
  it("allows the request for @Permissions() without arguments", async () => {
    reflector.get.mockReturnValue([]);

    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
    expect(permissionsService.hasAnyPermission).not.toHaveBeenCalled();
  });

  it("rejects a request without a user id with 403", async () => {
    reflector.get.mockReturnValue(["view_dashboard"]);

    await expect(guard.canActivate(contextFor())).rejects.toThrow(
      "No user ID found in request",
    );
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("treats 'a|b' inside one entry as OR and trims the names", async () => {
    reflector.get.mockReturnValue([" delete_task | delete_tasks "]);

    await expect(guard.canActivate(contextFor({ id: 5 }))).resolves.toBe(true);
    expect(permissionsService.hasAnyPermission).toHaveBeenCalledWith(
      5,
      ["delete_task", "delete_tasks"],
      PermissionFlag.READ,
    );
  });

  it("treats several entries as AND and names the first missing one", async () => {
    reflector.get.mockReturnValue(["view_dashboard", "manage_users"]);
    permissionsService.hasAnyPermission
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(guard.canActivate(contextFor({ id: 5 }))).rejects.toThrow(
      "Missing permission: manage_users",
    );
    expect(permissionsService.hasAnyPermission).toHaveBeenCalledTimes(2);
  });

  it("stops at the first missing entry", async () => {
    reflector.get.mockReturnValue(["a", "b", "c"]);
    permissionsService.hasAnyPermission.mockResolvedValueOnce(false);

    await expect(guard.canActivate(contextFor({ id: 5 }))).rejects.toThrow(
      "Missing permission: a",
    );
    expect(permissionsService.hasAnyPermission).toHaveBeenCalledTimes(1);
  });

  // THESIS: T94 – the guard always checks the READ flag, never WRITE or EXECUTE
  it("always requires the READ flag", async () => {
    reflector.get.mockReturnValue(["edit_tasks", "delete_tasks"]);

    await guard.canActivate(contextFor({ id: 5 }));

    const flags = permissionsService.hasAnyPermission.mock.calls.map(
      (call: unknown[]) => call[2],
    );
    expect(flags).toEqual([PermissionFlag.READ, PermissionFlag.READ]);
  });

  it("falls back to the raw expression when splitting leaves nothing", async () => {
    reflector.get.mockReturnValue(["|"]);

    await guard.canActivate(contextFor({ id: 5 }));

    expect(permissionsService.hasAnyPermission).toHaveBeenCalledWith(
      5,
      ["|"],
      PermissionFlag.READ,
    );
  });
});
