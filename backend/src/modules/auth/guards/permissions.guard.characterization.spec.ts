/**
 * Characterization tests for PermissionsGuard (GOALS.md M2; T54 and T94 flipped in M8).
 */
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import {
  PERMISSION_FLAG_KEY,
  PERMISSIONS_KEY,
} from "../decorators/permissions.decorator";
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

  // the handler's metadata: permission names and the required flag (absent = READ)
  const metadata = (names?: string[], flag?: PermissionFlag) =>
    reflector.get.mockImplementation((key: string) =>
      key === PERMISSIONS_KEY
        ? names
        : key === PERMISSION_FLAG_KEY
          ? flag
          : undefined,
    );

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
    metadata(undefined);

    await expect(guard.canActivate(contextFor({ id: 5 }))).resolves.toBe(true);
    expect(permissionsService.hasAnyPermission).not.toHaveBeenCalled();
  });

  // THESIS: T54 (flipped in M8) – an empty permission list fails closed
  it("rejects a handler whose @Permissions lists no permission", async () => {
    metadata([]);

    await expect(guard.canActivate(contextFor({ id: 5 }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(permissionsService.hasAnyPermission).not.toHaveBeenCalled();
  });

  it("rejects a request without a user id with 403", async () => {
    metadata(["view_dashboard"]);

    await expect(guard.canActivate(contextFor())).rejects.toThrow(
      "No user ID found in request",
    );
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("treats 'a|b' inside one entry as OR and trims the names", async () => {
    metadata([" delete_task | delete_tasks "]);

    await expect(guard.canActivate(contextFor({ id: 5 }))).resolves.toBe(true);
    expect(permissionsService.hasAnyPermission).toHaveBeenCalledWith(
      5,
      ["delete_task", "delete_tasks"],
      PermissionFlag.READ,
    );
  });

  it("treats several entries as AND and names the first missing one", async () => {
    metadata(["view_dashboard", "manage_users"]);
    permissionsService.hasAnyPermission
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(guard.canActivate(contextFor({ id: 5 }))).rejects.toThrow(
      "Missing permission: manage_users",
    );
    expect(permissionsService.hasAnyPermission).toHaveBeenCalledTimes(2);
  });

  it("stops at the first missing entry", async () => {
    metadata(["a", "b", "c"]);
    permissionsService.hasAnyPermission.mockResolvedValueOnce(false);

    await expect(guard.canActivate(contextFor({ id: 5 }))).rejects.toThrow(
      "Missing permission: a",
    );
    expect(permissionsService.hasAnyPermission).toHaveBeenCalledTimes(1);
  });

  // THESIS: T94 (flipped in M8) – the flag declared on the handler is checked
  it("checks the flag declared with @Permissions, READ by default", async () => {
    metadata(["edit_tasks", "delete_tasks"], PermissionFlag.WRITE);
    await guard.canActivate(contextFor({ id: 5 }));

    metadata(["view_dashboard"]);
    await guard.canActivate(contextFor({ id: 5 }));

    const flags = permissionsService.hasAnyPermission.mock.calls.map(
      (call: unknown[]) => call[2],
    );
    expect(flags).toEqual([
      PermissionFlag.WRITE,
      PermissionFlag.WRITE,
      PermissionFlag.READ,
    ]);
  });

  it("falls back to the raw expression when splitting leaves nothing", async () => {
    metadata(["|"]);

    await guard.canActivate(contextFor({ id: 5 }));

    expect(permissionsService.hasAnyPermission).toHaveBeenCalledWith(
      5,
      ["|"],
      PermissionFlag.READ,
    );
  });
});
