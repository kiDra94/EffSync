import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * PermissionChecker Service
 *
 * Distinguishes between:
 * - ROLE: binary, no validity period (e.g. "Teacher", "Admin")
 * - PERMISSION: binary with flags (READ=4, WRITE=2, EXECUTE=1), with a validity period
 */

export enum PermissionFlag {
  READ = 4, // 100
  WRITE = 2, // 010
  EXECUTE = 1, // 001
}

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Checks whether the user has a ROLE (simple and fast)
   * Roles have NO validity periods!
   */
  async hasRole(userId: number, roleName: string): Promise<boolean> {
    const userRole = await this.prisma.user_roles.findFirst({
      where: {
        user_id: userId,
        roles: { name: roleName },
      },
      include: { roles: true },
    });

    return !!userRole;
  }

  /**
   * Returns all roles of a user
   */
  async getUserRoles(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.user_roles.findMany({
      where: { user_id: userId },
      include: { roles: true },
    });

    return userRoles.map((ur) => ur.roles.name || "Unknown").filter(Boolean);
  }

  /**
   * Checks whether the user has a PERMISSION (validity period and flags checked)
   * Checks DIRECT permissions AND permissions through roles
   *
   * @param userId - User ID
   * @param permissionName - e.g. 'create_task', 'edit_grades'
   * @param requiredFlag - the required flag (READ, WRITE, EXECUTE)
   * @returns true if the permission is active and has the flag
   */
  async hasPermission(
    userId: number,
    permissionName: string,
    requiredFlag: PermissionFlag = PermissionFlag.READ,
  ): Promise<boolean> {
    // Support alias names such as delete_task <-> delete_tasks
    const permissionNames = Array.from(
      new Set([
        permissionName,
        permissionName.endsWith("s")
          ? permissionName.slice(0, -1)
          : `${permissionName}s`,
      ]),
    ).filter(Boolean);

    for (const name of permissionNames) {
      // 1. Check DIRECT permissions
      const userPermission = await this.prisma.user_permissions.findFirst({
        where: {
          user_id: userId,
          permissions: { name },
        },
        include: { permissions: true },
      });

      if (userPermission) {
        const now = new Date();
        const isTimeValid =
          (!userPermission.valid_from || now >= userPermission.valid_from) &&
          (!userPermission.valid_to || now <= userPermission.valid_to);

        if (isTimeValid) {
          // Check the flags (like Unix: bitwise AND)
          const hasFlagBits =
            (userPermission.permissions.flags & requiredFlag) === requiredFlag;
          if (hasFlagBits) {
            return true;
          }
        }
      }

      // 2. Check permissions through ROLES
      const rolePermission = await this.prisma.user_roles.findFirst({
        where: {
          user_id: userId,
          roles: {
            roles_permissions: {
              some: {
                permissions: { name },
              },
            },
          },
        },
        include: {
          roles: {
            include: {
              roles_permissions: {
                where: {
                  permissions: { name },
                },
                include: { permissions: true },
              },
            },
          },
        },
      });

      if (rolePermission && rolePermission.roles.roles_permissions.length > 0) {
        const permission =
          rolePermission.roles.roles_permissions[0].permissions;
        const hasFlagBits = (permission.flags & requiredFlag) === requiredFlag;
        if (hasFlagBits) return true;
      }
    }

    return false;
  }

  /**
   * Checks several permissions (OR logic - at least one must hold)
   */
  async hasAnyPermission(
    userId: number,
    permissionNames: string[],
    requiredFlag: PermissionFlag = PermissionFlag.READ,
  ): Promise<boolean> {
    for (const permName of permissionNames) {
      if (await this.hasPermission(userId, permName, requiredFlag)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks several permissions (AND logic - all must hold)
   */
  async hasAllPermissions(
    userId: number,
    permissionNames: string[],
    requiredFlag: PermissionFlag = PermissionFlag.READ,
  ): Promise<boolean> {
    for (const permName of permissionNames) {
      if (!(await this.hasPermission(userId, permName, requiredFlag))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns all active permissions of the user (validity period checked)
   */
  async getActivePermissions(userId: number): Promise<
    Array<{
      name: string;
      flags: number;
      valid_from: Date | null;
      valid_to: Date | null;
      isExpired: boolean;
    }>
  > {
    const permissions = await this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });

    const now = new Date();

    return permissions.map((up) => ({
      name: up.permissions.name,
      flags: up.permissions.flags,
      valid_from: up.valid_from,
      valid_to: up.valid_to,
      isExpired: up.valid_to !== null && now > up.valid_to,
    }));
  }

  /**
   * Returns expired permissions (for notifications)
   */
  async getExpiringPermissions(
    userId: number,
    daysUntilExpiry: number = 7,
  ): Promise<
    Array<{
      name: string;
      valid_to: Date;
      daysRemaining: number;
    }>
  > {
    const permissions = await this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });

    const now = new Date();
    const expiryThreshold = new Date(
      now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000,
    );

    return permissions
      .filter(
        (up) =>
          up.valid_to && up.valid_to > now && up.valid_to <= expiryThreshold,
      )
      .map((up) => ({
        name: up.permissions.name,
        valid_to: up.valid_to!,
        daysRemaining: Math.ceil(
          (up.valid_to!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        ),
      }));
  }

  /**
   * Returns all available permissions
   */
  async findAll() {
    return this.prisma.permissions.findMany({
      include: {
        roles_permissions: {
          include: {
            roles: true,
          },
        },
        user_permissions: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Returns one permission with its details
   */
  async findOne(permissionId: number) {
    return this.prisma.permissions.findUnique({
      where: { permission_id: permissionId },
      include: {
        roles_permissions: {
          include: {
            roles: true,
          },
        },
        user_permissions: true,
      },
    });
  }
}
