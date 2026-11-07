/**
 * Characterization tests for UsersService (GOALS.md M2).
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RolePermissionsService } from "../roles/role-permissions.service";

const DAY = 24 * 60 * 60 * 1000;

function createPrismaMock() {
  return {
    users: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permissions: { findUnique: jest.fn() },
    roles: { findUnique: jest.fn() },
    user_permissions: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user_roles: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };
}

describe("UsersService (characterization, M2)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let rolePermissions: { assignDefaultPermissionsForRole: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    rolePermissions = { assignDefaultPermissionsForRole: jest.fn() };
    service = new UsersService(
      prisma as unknown as PrismaService,
      rolePermissions as unknown as RolePermissionsService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  // THESIS: T50 (flipped in M9) – bcrypt cost factor 12
  it("creates a user with a bcrypt hash of cost 12 and without the plain password", async () => {
    await service.create({
      firstname: "Max",
      lastname: "M",
      email: "max@htl.at",
      username: "maxm",
      password: "geheim123",
    } as never);

    const data = (
      prisma.users.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data).not.toHaveProperty("password");
    expect(String(data.password_hash)).toMatch(/^\$2[aby]\$12\$/);
    expect(data.username).toBe("maxm");
  });

  it("finds users by e-mail and by username", async () => {
    await service.findByEmail("a@b.at");
    await service.findByUsername("abc");

    expect(prisma.users.findUnique).toHaveBeenNthCalledWith(1, {
      where: { email: "a@b.at" },
    });
    expect(prisma.users.findUnique).toHaveBeenNthCalledWith(2, {
      where: { username: "abc" },
    });
  });

  it("lists users for the chat sorted by last and first name", async () => {
    await service.findAllForChat();
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
      }),
    );
  });

  it("lists users with roles and permissions, without password hashes", async () => {
    await service.findAll();

    const select = (
      prisma.users.findMany.mock.calls[0][0] as {
        select: Record<string, unknown>;
      }
    ).select;
    expect(select).not.toHaveProperty("password_hash");
    expect(select).toHaveProperty("user_roles");
    expect(select).toHaveProperty("user_permissions");
  });

  it("throws 404 for an unknown user in findOne", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    await expect(service.findOne(9)).rejects.toThrow(
      "Member with ID 9 not found",
    );
  });

  it("updates the user with the DTO as is", async () => {
    await service.update(3, { firstname: "Neu" } as never);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { user_id: 3 },
      data: { firstname: "Neu" },
    });
  });

  // THESIS: T10 – account deletion is a hard delete, no ghost-user anonymization
  it("hard-deletes the user row", async () => {
    await service.remove(3);

    expect(prisma.users.delete).toHaveBeenCalledWith({ where: { user_id: 3 } });
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  describe("permissions and roles", () => {
    it("returns only direct permissions that are valid today", async () => {
      prisma.user_permissions.findMany.mockResolvedValue([
        {
          valid_from: null,
          valid_to: null,
          permissions: { name: "a", description: "A", flags: 4 },
        },
        {
          valid_from: new Date(Date.now() + DAY),
          valid_to: null,
          permissions: { name: "b", description: "B", flags: 4 },
        },
        {
          valid_from: null,
          valid_to: new Date(Date.now() - DAY),
          permissions: { name: "c", description: "C", flags: 4 },
        },
      ]);

      const result = await service.getUserPermissions(1);

      expect(result).toEqual([
        {
          name: "a",
          description: "A",
          flags: 4,
          valid_from: null,
          valid_to: null,
          status: "VALID",
        },
      ]);
    });

    it("combines direct permissions, roles and de-duplicated role permissions", async () => {
      prisma.user_roles.findMany.mockResolvedValue([
        {
          role_id: 2,
          roles: {
            name: "Teacher",
            roles_permissions: [
              { permissions: { name: "x", description: "X", flags: 4 } },
              { permissions: { name: "y", description: "Y", flags: 6 } },
            ],
          },
        },
        {
          role_id: 3,
          roles: {
            name: "Admin",
            roles_permissions: [
              { permissions: { name: "x", description: "X2", flags: 7 } },
            ],
          },
        },
      ]);

      const result = await service.getUserPermissionsAndRoles(1);

      expect(result.userId).toBe(1);
      expect(result.roles.map((role) => role.name)).toEqual([
        "Teacher",
        "Admin",
      ]);
      expect(result.rolePermissions).toEqual([
        { name: "x", description: "X", flags: 4 },
        { name: "y", description: "Y", flags: 6 },
      ]);
    });

    it("adds a permission with optional limits after checking user, permission and duplicates", async () => {
      prisma.users.findUnique.mockResolvedValueOnce(null);
      await expect(service.addPermissionToUser(1, 2)).rejects.toThrow(
        "User 1 nicht gefunden",
      );

      prisma.users.findUnique.mockResolvedValue({ user_id: 1 });
      prisma.permissions.findUnique.mockResolvedValueOnce(null);
      await expect(service.addPermissionToUser(1, 2)).rejects.toThrow(
        "Permission 2 nicht gefunden",
      );

      prisma.permissions.findUnique.mockResolvedValue({ permission_id: 2 });
      prisma.user_permissions.findUnique.mockResolvedValueOnce({ user_id: 1 });
      await expect(service.addPermissionToUser(1, 2)).rejects.toThrow(
        BadRequestException,
      );

      prisma.user_permissions.findUnique.mockResolvedValue(null);
      const validTo = new Date(Date.now() + DAY);
      await service.addPermissionToUser(1, 2, undefined, validTo);
      expect(prisma.user_permissions.create).toHaveBeenCalledWith({
        data: {
          user_id: 1,
          permission_id: 2,
          valid_from: null,
          valid_to: validTo,
        },
        include: { permissions: true },
      });
    });

    it("removes a direct permission, or throws 404 when the user doesn't have it", async () => {
      prisma.user_permissions.findUnique.mockResolvedValueOnce(null);
      await expect(service.removePermissionFromUser(1, 2)).rejects.toThrow(
        NotFoundException,
      );

      prisma.user_permissions.findUnique.mockResolvedValue({ user_id: 1 });
      await service.removePermissionFromUser(1, 2);
      expect(prisma.user_permissions.delete).toHaveBeenCalledWith({
        where: { user_id_permission_id: { user_id: 1, permission_id: 2 } },
      });
    });

    it("assigns a role and its default permissions", async () => {
      prisma.users.findUnique.mockResolvedValue({ user_id: 1 });
      prisma.roles.findUnique.mockResolvedValue({
        role_id: 2,
        name: "Teacher",
      });
      prisma.user_roles.findUnique.mockResolvedValue(null);
      prisma.user_roles.create.mockResolvedValue({ user_id: 1, role_id: 2 });

      await expect(service.addRoleToUser(1, 2)).resolves.toEqual({
        user_id: 1,
        role_id: 2,
      });
      expect(
        rolePermissions.assignDefaultPermissionsForRole,
      ).toHaveBeenCalledWith(1, 2, "Teacher");
    });

    it("keeps the role assignment when the default permissions fail", async () => {
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      prisma.users.findUnique.mockResolvedValue({ user_id: 1 });
      prisma.roles.findUnique.mockResolvedValue({
        role_id: 2,
        name: "Teacher",
      });
      prisma.user_roles.findUnique.mockResolvedValue(null);
      prisma.user_roles.create.mockResolvedValue({ user_id: 1, role_id: 2 });
      rolePermissions.assignDefaultPermissionsForRole.mockRejectedValue(
        new Error("boom"),
      );

      await expect(service.addRoleToUser(1, 2)).resolves.toEqual({
        user_id: 1,
        role_id: 2,
      });
    });

    it("rejects assigning a role to an unknown user, an unknown role or twice", async () => {
      prisma.users.findUnique.mockResolvedValueOnce(null);
      await expect(service.addRoleToUser(1, 2)).rejects.toThrow(
        "User 1 nicht gefunden",
      );

      prisma.users.findUnique.mockResolvedValue({ user_id: 1 });
      prisma.roles.findUnique.mockResolvedValueOnce(null);
      await expect(service.addRoleToUser(1, 2)).rejects.toThrow(
        "Role 2 nicht gefunden",
      );

      prisma.roles.findUnique.mockResolvedValue({
        role_id: 2,
        name: "Teacher",
      });
      prisma.user_roles.findUnique.mockResolvedValue({
        user_id: 1,
        role_id: 2,
      });
      await expect(service.addRoleToUser(1, 2)).rejects.toThrow(
        "User hat diese Rolle bereits",
      );
    });

    it("refuses to remove the last Superuser or Admin", async () => {
      prisma.roles.findUnique.mockResolvedValue({
        role_id: 1,
        name: "Superuser",
      });
      prisma.user_roles.findUnique.mockResolvedValue({
        user_id: 1,
        role_id: 1,
      });
      prisma.user_roles.count.mockResolvedValue(1);

      await expect(service.removeRoleFromUser(1, 1)).rejects.toThrow(
        "Kann nicht durchgeführt werden: Es muss mindestens 1 Superuser existieren",
      );
      expect(prisma.user_roles.delete).not.toHaveBeenCalled();
    });

    it("removes a critical role when another holder exists, and other roles without counting", async () => {
      prisma.user_roles.findUnique.mockResolvedValue({ user_id: 1 });
      prisma.roles.findUnique.mockResolvedValueOnce({
        role_id: 1,
        name: "Admin",
      });
      prisma.user_roles.count.mockResolvedValue(2);
      await service.removeRoleFromUser(1, 1);

      prisma.roles.findUnique.mockResolvedValueOnce({
        role_id: 4,
        name: "Student",
      });
      await service.removeRoleFromUser(1, 4);

      expect(prisma.user_roles.count).toHaveBeenCalledTimes(1);
      expect(prisma.user_roles.delete).toHaveBeenCalledTimes(2);
    });

    it("throws 404 when removing an unknown role or a role the user doesn't have", async () => {
      prisma.roles.findUnique.mockResolvedValueOnce(null);
      await expect(service.removeRoleFromUser(1, 9)).rejects.toThrow(
        "Role 9 nicht gefunden",
      );

      prisma.roles.findUnique.mockResolvedValue({
        role_id: 4,
        name: "Student",
      });
      prisma.user_roles.findUnique.mockResolvedValue(null);
      await expect(service.removeRoleFromUser(1, 4)).rejects.toThrow(
        "User hat diese Rolle nicht",
      );
    });
  });
});
