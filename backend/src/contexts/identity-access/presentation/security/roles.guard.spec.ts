import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { PermissionsService } from "../../application/permissions.service";
import { RoleName } from "../../domain/role-permissions";

// T92 (M7): @Roles(...) passes when the user has at least one of the roles
class Handlers {
  @Roles(RoleName.TEACHER, RoleName.ADMIN)
  restricted() {}

  open() {}
}

// the decorated methods as plain functions, the way Nest hands them to the guard
const restricted = Reflect.get(Handlers.prototype, "restricted") as () => void;
const open = Reflect.get(Handlers.prototype, "open") as () => void;

describe("RolesGuard", () => {
  const hasAnyRole = jest.fn();
  const guard = new RolesGuard(new Reflector(), {
    hasAnyRole,
  } as unknown as PermissionsService);

  const context = (handler: () => void, user?: { userId: number }) =>
    ({
      getHandler: () => handler,
      getClass: () => Handlers,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it("lets every request through on a handler without @Roles", async () => {
    await expect(guard.canActivate(context(open))).resolves.toBe(true);
    expect(hasAnyRole).not.toHaveBeenCalled();
  });

  it("accepts a user with one of the roles, checked in one query", async () => {
    hasAnyRole.mockResolvedValue(true);

    await expect(
      guard.canActivate(context(restricted, { userId: 4 })),
    ).resolves.toBe(true);
    expect(hasAnyRole).toHaveBeenCalledWith(4, [
      RoleName.TEACHER,
      RoleName.ADMIN,
    ]);
  });

  it("rejects a user with none of the roles with 403", async () => {
    hasAnyRole.mockResolvedValue(false);

    await expect(
      guard.canActivate(context(restricted, { userId: 4 })),
    ).rejects.toThrow(
      new ForbiddenException("Insufficient role. Required: Teacher OR Admin"),
    );
  });

  it("rejects a request without a user with 403", async () => {
    await expect(guard.canActivate(context(restricted))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
