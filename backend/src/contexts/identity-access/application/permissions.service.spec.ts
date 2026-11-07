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

  beforeEach(async () => {
    userRolesFindFirst = jest.fn();
    userRolesCount = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PermissionRepository, useClass: PrismaPermissionRepository },
        PermissionsService,
        {
          provide: PrismaService,
          useValue: {
            user_roles: {
              findFirst: userRolesFindFirst,
              count: userRolesCount,
              findMany: jest.fn(),
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
      (prisma.user_permissions.findFirst as jest.Mock).mockResolvedValue({
        user_id: 1,
        permission_id: 4,
        valid_from: new Date(now.getTime() - 86400000), // Yesterday
        valid_to: new Date(now.getTime() + 86400000), // Tomorrow
        permissions: { name: "edit_tasks", flags: 6 }, // RW
      });

      const result = await service.hasPermission(
        1,
        "edit_tasks",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(true);
    });

    it("should return false if permission is expired", async () => {
      const now = new Date();
      (prisma.user_permissions.findFirst as jest.Mock).mockResolvedValue({
        user_id: 1,
        permission_id: 4,
        valid_from: new Date(now.getTime() - 172800000), // 2 days ago
        valid_to: new Date(now.getTime() - 86400000), // 1 day ago
        permissions: { name: "edit_tasks", flags: 6 },
      });

      const result = await service.hasPermission(
        1,
        "edit_tasks",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(false);
    });

    it("should return false if permission is not yet valid", async () => {
      const now = new Date();
      (prisma.user_permissions.findFirst as jest.Mock).mockResolvedValue({
        user_id: 1,
        permission_id: 4,
        valid_from: new Date(now.getTime() + 86400000), // Tomorrow
        valid_to: new Date(now.getTime() + 172800000), // 2 days from now
        permissions: { name: "edit_tasks", flags: 6 },
      });

      const result = await service.hasPermission(
        1,
        "edit_tasks",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(false);
    });

    it("should return false if flags do not match", async () => {
      const now = new Date();
      (prisma.user_permissions.findFirst as jest.Mock).mockResolvedValue({
        user_id: 1,
        permission_id: 6,
        valid_from: new Date(now.getTime() - 86400000),
        valid_to: new Date(now.getTime() + 86400000),
        permissions: { name: "view_grades", flags: 4 }, // READ only
      });

      const result = await service.hasPermission(
        1,
        "view_grades",
        PermissionFlag.WRITE,
      );

      expect(result).toBe(false);
    });
  });

  describe("getActivePermissions", () => {
    it("should return only active permissions within time window", async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000);
      const nextWeek = new Date(now.getTime() + 604800000);

      (prisma.user_permissions.findMany as jest.Mock).mockResolvedValue([
        {
          user_id: 1,
          permission_id: 3,
          valid_from: null,
          valid_to: null,
          permissions: { name: "create_tasks", flags: 7 },
        },
        {
          user_id: 1,
          permission_id: 4,
          valid_from: new Date(now.getTime() - 86400000),
          valid_to: nextWeek,
          permissions: { name: "edit_tasks", flags: 6 },
        },
      ]);

      const result = await service.getActivePermissions(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("create_tasks");
      expect(result[1].name).toBe("edit_tasks");
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
