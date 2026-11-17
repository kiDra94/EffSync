import { Injectable } from "@nestjs/common";
import { PermissionFlag } from "../domain/permission-flag";
import { PermissionRepository } from "./ports/access.repositories";
import { RoleName } from "../domain/role-permissions";

/**
 * PermissionChecker Service
 *
 * Distinguishes between:
 * - ROLE: binary, no validity period (e.g. RoleName.TEACHER, RoleName.ADMIN)
 * - PERMISSION: binary with flags (READ=4, WRITE=2, EXECUTE=1), with a validity period
 */

@Injectable()
export class PermissionsService {
  constructor(private readonly permissions: PermissionRepository) {}

  /**
   * Checks whether the user has a ROLE (simple and fast)
   * Roles have NO validity periods!
   */
  async hasRole(userId: number, roleName: RoleName): Promise<boolean> {
    return this.hasAnyRole(userId, [roleName]);
  }

  /**
   * Checks with one query whether the user has at least one of the roles (T92).
   */
  async hasAnyRole(
    userId: number,
    roleNames: readonly RoleName[],
  ): Promise<boolean> {
    const count = await this.permissions.countUserRolesNamed(userId, roleNames);
    return count > 0;
  }

  /**
   * The users among `userIds` who hold at least one of the roles, in one
   * query (review of M38: not one per member of a list).
   */
  async usersWithAnyRole(
    userIds: number[],
    roleNames: readonly RoleName[],
  ): Promise<Set<number>> {
    if (userIds.length === 0) return new Set();
    return new Set(
      await this.permissions.findUserIdsWithRoles(userIds, roleNames),
    );
  }

  /**
   * Returns all roles of a user
   */
  async getUserRoles(userId: number): Promise<string[]> {
    const userRoles = await this.permissions.findUserRoles(userId);

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

    // M37: all grants of both names in one query instead of six per check
    const grants = await this.permissions.findGrants(userId, permissionNames);
    const now = new Date();
    const hasFlagBits = (flags: number) =>
      (flags & Number(requiredFlag)) === Number(requiredFlag);

    for (const name of permissionNames) {
      // 1. Check DIRECT permissions
      const direct = grants.find((g) => g.via === "user" && g.name === name);
      if (direct) {
        const isTimeValid =
          (!direct.valid_from || now >= direct.valid_from) &&
          (!direct.valid_to || now <= direct.valid_to);
        // Check the flags (like Unix: bitwise AND)
        if (isTimeValid && hasFlagBits(direct.flags)) return true;
      }

      // 2. Check permissions through ROLES
      const viaRole = grants.find((g) => g.via === "role" && g.name === name);
      if (viaRole && hasFlagBits(viaRole.flags)) return true;
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
    const permissions = await this.permissions.findPermissionsOfUser(userId);

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
    return this.permissions.findAllPermissions();
  }

  /**
   * Returns one permission with its details
   */
  async findOne(permissionId: number) {
    return this.permissions.findPermission(permissionId);
  }
}
