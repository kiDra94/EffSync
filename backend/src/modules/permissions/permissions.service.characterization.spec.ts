/**
 * Characterization tests for PermissionsService (GOALS.md M2): validity
 * window, flag bitmask, name aliases, the role fallback and the OR/AND helpers.
 */
import { PermissionFlag, PermissionsService } from "./permissions.service";
import { PrismaService } from "../../prisma/prisma.service";

type NameWhere = {
  where: { permissions?: { name?: string }; roles?: unknown };
};
type DirectPermission = {
  valid_from: Date | null;
  valid_to: Date | null;
  permissions: { flags: number };
};

const DAY = 24 * 60 * 60 * 1000;

function createPrismaMock() {
  return {
    user_permissions: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user_roles: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    permissions: { findMany: jest.fn(), findUnique: jest.fn() },
  };
}

describe("PermissionsService (characterization, M2)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: PermissionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PermissionsService(prisma as unknown as PrismaService);
  });

  const direct = (
    flags: number,
    validFrom: Date | null = null,
    validTo: Date | null = null,
  ): DirectPermission => ({
    valid_from: validFrom,
    valid_to: validTo,
    permissions: { flags },
  });

  const directByName = (byName: Record<string, DirectPermission>) =>
    prisma.user_permissions.findFirst.mockImplementation((args: NameWhere) =>
      Promise.resolve(byName[args.where.permissions?.name ?? ""] ?? null),
    );

  type RoleWhere = {
    where: {
      roles?: {
        roles_permissions?: { some?: { permissions?: { name?: string } } };
      };
    };
  };
  const roleWithFlags = (...flags: number[]) => ({
    roles: {
      roles_permissions: flags.map((value) => ({
        permissions: { flags: value },
      })),
    },
  });
  // returns the role only when the query asks for that permission name
  const roleByName = (
    byName: Record<string, ReturnType<typeof roleWithFlags>>,
  ) =>
    prisma.user_roles.findFirst.mockImplementation((args: RoleWhere) =>
      Promise.resolve(
        byName[
          args.where.roles?.roles_permissions?.some?.permissions?.name ?? ""
        ] ?? null,
      ),
    );

  describe("hasPermission: validity window", () => {
    it("accepts a permission inside its window", async () => {
      directByName({
        edit_tasks: direct(
          7,
          new Date(Date.now() - DAY),
          new Date(Date.now() + DAY),
        ),
      });
      await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(true);
    });

    it("accepts a permission without any limits", async () => {
      directByName({ edit_tasks: direct(4) });
      await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(true);
    });

    it("rejects a permission that is not valid yet or has expired", async () => {
      directByName({ edit_tasks: direct(7, new Date(Date.now() + DAY)) });
      await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(false);

      directByName({ edit_tasks: direct(7, null, new Date(Date.now() - DAY)) });
      await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(false);
    });
  });

  describe("hasPermission: flag bitmask", () => {
    it.each([
      [7, PermissionFlag.READ, true],
      [7, PermissionFlag.WRITE, true],
      [7, PermissionFlag.EXECUTE, true],
      [6, PermissionFlag.WRITE, true],
      [6, PermissionFlag.EXECUTE, false],
      [4, PermissionFlag.WRITE, false],
      [2, PermissionFlag.READ, false],
      [1, PermissionFlag.EXECUTE, true],
      [0, PermissionFlag.READ, false],
    ])(
      "flags %i with required flag %i -> %s",
      async (flags, required, expected) => {
        directByName({ edit_tasks: direct(flags) });
        await expect(
          service.hasPermission(1, "edit_tasks", required),
        ).resolves.toBe(expected);
      },
    );

    it("checks READ when no flag is given", async () => {
      directByName({ edit_tasks: direct(2) });
      await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(false);
    });
  });

  describe("hasPermission: aliases and role fallback", () => {
    it("also checks the singular or plural alias of the name", async () => {
      directByName({ delete_task: direct(4) });

      await expect(service.hasPermission(1, "delete_tasks")).resolves.toBe(
        true,
      );
      const names = prisma.user_permissions.findFirst.mock.calls.map(
        (call: unknown[]) => (call[0] as NameWhere).where.permissions?.name,
      );
      expect(names).toEqual(["delete_tasks", "delete_task"]);
    });

    it("builds the plural alias for a singular name", async () => {
      await service.hasPermission(1, "manage_system");

      const names = prisma.user_permissions.findFirst.mock.calls.map(
        (call: unknown[]) => (call[0] as NameWhere).where.permissions?.name,
      );
      expect(names).toEqual(["manage_system", "manage_systems"]);
    });

    it("falls back to the role permission when the direct one has expired", async () => {
      directByName({ edit_tasks: direct(7, null, new Date(Date.now() - DAY)) });
      roleByName({ edit_tasks: roleWithFlags(4) });

      await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(true);
    });

    it("applies the flag check to role permissions too", async () => {
      roleByName({ edit_tasks: roleWithFlags(4) });

      await expect(
        service.hasPermission(1, "edit_tasks", PermissionFlag.WRITE),
      ).resolves.toBe(false);
    });

    it("uses only the first matching role permission", async () => {
      roleByName({ edit_tasks: roleWithFlags(4, 7) });

      await expect(
        service.hasPermission(1, "edit_tasks", PermissionFlag.EXECUTE),
      ).resolves.toBe(false);
    });

    it("ignores a role without matching role permissions", async () => {
      roleByName({ edit_tasks: roleWithFlags() });
      await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(false);
    });
  });

  it("does not grant a name through a role permission for another name", async () => {
    roleByName({ view_dashboard: roleWithFlags(7) });
    await expect(service.hasPermission(1, "edit_tasks")).resolves.toBe(false);
  });

  describe("hasAnyPermission / hasAllPermissions", () => {
    it("returns true as soon as one name matches and stops there", async () => {
      directByName({ b: direct(4) });
      const spy = jest.spyOn(service, "hasPermission");

      await expect(service.hasAnyPermission(1, ["a", "b", "c"])).resolves.toBe(
        true,
      );
      expect(spy.mock.calls.map((call) => call[1])).toEqual(["a", "b"]);
    });

    it("passes the required flag through and returns false when nothing matches", async () => {
      directByName({ a: direct(4) });

      await expect(
        service.hasAnyPermission(1, ["a"], PermissionFlag.WRITE),
      ).resolves.toBe(false);
      await expect(service.hasAnyPermission(1, [])).resolves.toBe(false);
    });

    it("requires every name for hasAllPermissions", async () => {
      directByName({ a: direct(4), b: direct(4) });

      await expect(service.hasAllPermissions(1, ["a", "b"])).resolves.toBe(
        true,
      );
      await expect(service.hasAllPermissions(1, ["a", "x"])).resolves.toBe(
        false,
      );
    });
  });

  describe("roles and listings", () => {
    it("returns the user's role names", async () => {
      prisma.user_roles.findMany.mockResolvedValue([
        { roles: { name: "Teacher" } },
        { roles: { name: null } },
      ]);
      await expect(service.getUserRoles(1)).resolves.toEqual([
        "Teacher",
        "Unknown",
      ]);
    });

    it("lists all permissions by name and fetches one by id", async () => {
      await service.findAll();
      await service.findOne(3);

      expect(prisma.permissions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: "asc" } }),
      );
      expect(prisma.permissions.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { permission_id: 3 } }),
      );
    });
  });
});
