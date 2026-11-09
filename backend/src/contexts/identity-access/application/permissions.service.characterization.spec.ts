/**
 * Characterization tests for PermissionsService (GOALS.md M2): validity
 * window, flag bitmask, name aliases, the role fallback and the OR/AND helpers.
 */
import { PrismaPermissionRepository } from "../infrastructure/persistence/prisma-access.repositories";
import { PermissionsService } from "./permissions.service";
import { PermissionFlag } from "../domain/permission-flag";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";

import type { Prisma } from "@prisma/client";
type DirectPermission = {
  valid_from: Date | null;
  valid_to: Date | null;
  permissions: { flags: number };
};

const DAY = 24 * 60 * 60 * 1000;

function createPrismaMock() {
  return {
    // M37: the grants of the asked names in one query
    $queryRaw: jest.fn().mockResolvedValue([]),
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
    service = new PermissionsService(
      new PrismaPermissionRepository(prisma as unknown as PrismaService),
    );
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

  // M37: one query answers the direct grant and the first role's grant per
  // asked name; the fake answers like it, for the names the query asks
  let directGrants: Record<string, DirectPermission> = {};
  let roleGrants: Record<string, number[]> = {};
  const askedNames = (call = 0) => [
    ...new Set(
      (prisma.$queryRaw.mock.calls as [Prisma.Sql][])[call][0].values.filter(
        (value): value is string => typeof value === "string",
      ),
    ),
  ];
  const answerGrants = () =>
    prisma.$queryRaw.mockImplementation((query: Prisma.Sql) => {
      const names = new Set(
        query.values.filter((v): v is string => typeof v === "string"),
      );
      return Promise.resolve([
        ...Object.entries(directGrants)
          .filter(([name]) => names.has(name))
          .map(([name, grant]) => ({
            name,
            via: "user",
            flags: grant.permissions.flags,
            valid_from: grant.valid_from,
            valid_to: grant.valid_to,
          })),
        // DISTINCT ON: the first matching role permission only
        ...Object.entries(roleGrants)
          .filter(([name, flags]) => names.has(name) && flags.length > 0)
          .map(([name, flags]) => ({
            name,
            via: "role",
            flags: flags[0],
            valid_from: null,
            valid_to: null,
          })),
      ]);
    });
  const directByName = (byName: Record<string, DirectPermission>) => {
    directGrants = byName;
    answerGrants();
  };
  const roleWithFlags = (...flags: number[]) => flags;
  const roleByName = (byName: Record<string, number[]>) => {
    roleGrants = byName;
    answerGrants();
  };

  beforeEach(() => {
    directGrants = {};
    roleGrants = {};
  });

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
      expect(askedNames()).toEqual(["delete_tasks", "delete_task"]);
      // both names in one query (M37)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("builds the plural alias for a singular name", async () => {
      await service.hasPermission(1, "manage_system");

      expect(askedNames()).toEqual(["manage_system", "manage_systems"]);
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
      // M37: "first" is now fixed: the lowest role id, then permission id
      // (findFirst without an order took any row); the same for direct grants
      const { sql } = (prisma.$queryRaw.mock.calls as [Prisma.Sql][])[0][0];
      expect(sql).toMatch(
        /DISTINCT ON \(p\.name\)[\s\S]*ORDER BY p\.name, ur\.role_id, p\.permission_id/,
      );
      expect(sql).toMatch(
        /DISTINCT ON \(p\.name\)[\s\S]*ORDER BY p\.name, p\.permission_id/,
      );
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
