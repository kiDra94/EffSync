import { PermissionRepository } from "./ports/access.repositories";
import { PrismaPermissionRepository } from "../infrastructure/persistence/prisma-access.repositories";
import { Test, TestingModule } from "@nestjs/testing";
import { PermissionsService } from "./permissions.service";
import { PermissionFlag } from "../domain/permission-flag";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { RoleName } from "../domain/role-permissions";

describe("PermissionsService", () => {
  let service: PermissionsService;
  let prisma: PrismaService;
  let userRolesFindFirst: jest.Mock;
  let userRolesCount: jest.Mock;
  let userRolesFindMany: jest.Mock;

  beforeEach(async () => {
    userRolesFindFirst = jest.fn();
    userRolesCount = jest.fn();
    userRolesFindMany = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PermissionRepository, useClass: PrismaPermissionRepository },
        PermissionsService,
        {
          provide: PrismaService,
          useValue: {
            // M37: the grants in one query
            $queryRaw: jest.fn().mockResolvedValue([]),
            user_roles: {
              findFirst: userRolesFindFirst,
              count: userRolesCount,
              findMany: userRolesFindMany,
            },
            permissions: {
              findUnique: jest.fn(),
            },
            user_permissions: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // M7: hasRole is hasAnyRole with one role (one count query, case-insensitive)
  describe("hasRole", () => {
    it("should return true if user has role", async () => {
      userRolesCount.mockResolvedValue(1);

      const result = await service.hasRole(1, RoleName.TEACHER);

      expect(result).toBe(true);
      expect(userRolesCount).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          roles: {
            OR: [{ name: { equals: RoleName.TEACHER, mode: "insensitive" } }],
          },
        },
      });
    });

    it("should return false if user does not have role", async () => {
      userRolesCount.mockResolvedValue(0);

      const result = await service.hasRole(1, RoleName.ADMIN);

      expect(result).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("should return true if user has valid permission with correct flags", async () => {
      const now = new Date();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          name: "edit_tasks",
          via: "user",
          flags: 6,
          valid_from: new Date(now.getTime() - 86400000),
          valid_to: new Date(now.getTime() + 86400000),
        },
      ]);

      const result = await service.hasPermission(
        1,
        "edit_tasks",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(true);
    });

    it("should return false if permission is expired", async () => {
      const now = new Date();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          name: "edit_tasks",
          via: "user",
          flags: 6,
          valid_from: new Date(now.getTime() - 172800000),
          valid_to: new Date(now.getTime() - 86400000),
        },
      ]);

      const result = await service.hasPermission(
        1,
        "edit_tasks",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(false);
    });

    it("should return false if permission is not yet valid", async () => {
      const now = new Date();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          name: "edit_tasks",
          via: "user",
          flags: 6,
          valid_from: new Date(now.getTime() + 86400000),
          valid_to: new Date(now.getTime() + 172800000),
        },
      ]);

      const result = await service.hasPermission(
        1,
        "edit_tasks",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(false);
    });

    it("should return false if flags do not match", async () => {
      const now = new Date();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          name: "view_grades",
          via: "user",
          flags: 4,
          valid_from: new Date(now.getTime() - 86400000),
          valid_to: new Date(now.getTime() + 86400000),
        },
      ]);

      const result = await service.hasPermission(
        1,
        "view_grades",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(false);
    });
  });

  // review of M38: the role holders among many users in one query, for the
  // task member list (Admin/Superuser hold every flag on a task)
  describe("usersWithAnyRole", () => {
    it("returns the users of the list who hold one of the roles", async () => {
      userRolesFindMany.mockResolvedValue([
        { user_id: 1 },
        { user_id: 1 },
        { user_id: 9 },
      ]);

      await expect(
        service.usersWithAnyRole(
          [1, 4, 9],
          [RoleName.ADMIN, RoleName.SUPERUSER],
        ),
      ).resolves.toEqual(new Set([1, 9]));
      expect(userRolesFindMany).toHaveBeenCalledTimes(1);
    });

    it("asks nothing for an empty list", async () => {
      await expect(
        service.usersWithAnyRole([], [RoleName.ADMIN]),
      ).resolves.toEqual(new Set());
      expect(userRolesFindMany).not.toHaveBeenCalled();
    });
  });

  describe("getExpiringPermissions", () => {
    it("should return permissions expiring within specified days", async () => {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 259200000);
      const in10Days = new Date(now.getTime() + 864000000);

      (prisma.user_permissions.findMany as jest.Mock).mockResolvedValue([
        {
          user_id: 1,
          permission_id: 4,
          valid_from: new Date(now.getTime() - 86400000),
          valid_to: in3Days,
          permissions: { name: "edit_tasks", flags: 6 },
        },
        {
          user_id: 1,
          permission_id: 8,
          valid_from: new Date(now.getTime() - 86400000),
          valid_to: in10Days,
          permissions: { name: "manage_classes", flags: 7 },
        },
      ]);

      const result = await service.getExpiringPermissions(1, 7);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("edit_tasks");
      expect(result[0].daysRemaining).toBeLessThanOrEqual(3);
    });
  });
});
