import { Injectable } from "@nestjs/common";
import { RolePermissionRepository } from "./ports/access.repositories";
import { getPermissionsForRole } from "../domain/role-permissions";

/**
 * Service that manages role-permission assignments
 * Handles the automatic assignment and its management
 */
@Injectable()
export class RolePermissionsService {
  constructor(private readonly rolePermissions: RolePermissionRepository) {}

  /**
   * Returns all permission IDs of a role
   * @param roleId - the role ID
   * @returns array of permission IDs
   */
  async getPermissionIdsForRole(roleId: number): Promise<number[]> {
    return this.rolePermissions.findPermissionIdsOfRole(roleId);
  }

  /**
   * Finds a permission ID by name
   * @param permissionName - the permission's name (e.g. 'create_tasks')
   * @returns the permission ID or null
   */
  async getPermissionIdByName(permissionName: string): Promise<number | null> {
    return this.rolePermissions.findPermissionIdByName(permissionName);
  }

  /**
   * Assigns all default permissions of a role to a user
   * @param userId - the user ID
   * @param roleId - the role ID
   * @param roleName - the role's name (e.g. RoleName.STUDENT)
   */
  async assignDefaultPermissionsForRole(
    userId: number,
    roleId: number,
    roleName: string,
  ): Promise<void> {
    console.log(
      `\n📋 Weisen automatisch Permissions für Rolle "${roleName}" zu User ${userId} zu`,
    );

    // Get the configured permissions for the role
    const permissionNames = getPermissionsForRole(roleName);

    if (!permissionNames || permissionNames.length === 0) {
      console.warn(
        `  ⚠️  Keine Permissions in Konfiguration für Rolle "${roleName}" definiert`,
      );
      return;
    }

    let assignedCount = 0;
    let skippedCount = 0;

    for (const permName of permissionNames) {
      try {
        // Find the permission ID
        const permId = await this.getPermissionIdByName(permName);

        if (!permId) {
          console.warn(
            `  ⚠️  Permission "${permName}" nicht in DB gefunden, überspringe`,
          );
          continue;
        }

        // Check whether the user already has this permission
        const existing = await this.rolePermissions.findUserPermission(
          userId,
          permId,
        );

        if (existing) {
          console.log(
            `  ⊘ Permission "${permName}" existiert bereits, überspringe`,
          );
          skippedCount++;
          continue;
        }

        // Create the permission
        await this.rolePermissions.grantPermissionFromNow(userId, permId);

        console.log(`  ✓ Permission "${permName}" zugewiesen`);
        assignedCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`  ✗ Fehler bei Permission "${permName}":`, errorMessage);
      }
    }

    console.log(
      `  📊 Zusammenfassung: ${assignedCount} neu zugewiesen, ${skippedCount} übersprungen`,
    );
  }

  /**
   * Removes permissions that came from a role
   * (but only if no other role of the user still grants the permission)
   *
   * @param userId - the user ID
   * @param roleId - the ID of the role being removed
   */
  async removeRolePermissionsIfNotNeeded(
    userId: number,
    roleId: number,
  ): Promise<void> {
    console.log(
      `\n🗑️  Überprüfe ob Permissions entfernt werden können nach Rollen-Entfernung`,
    );

    // Get all permissions this role had
    const permissionIds =
      await this.rolePermissions.findPermissionIdsOfRole(roleId);

    for (const permissionId of permissionIds) {
      // Check whether another role of the user still has this permission
      const otherRoleWithPerm =
        await this.rolePermissions.findOtherRoleGranting(userId, permissionId);

      if (!otherRoleWithPerm) {
        // No other role of the user has this permission
        try {
          await this.rolePermissions.revokePermission(userId, permissionId);
          console.log(`  ✓ Permission entfernt (keine andere Rolle hat sie)`);
        } catch (error) {
          // The permission may not exist in user_permissions at all
          console.log(`  ⊘ Permission war bereits nicht direkt zugewiesen`);
        }
      } else {
        console.log(
          `  ⊘ Permission wird noch von andere Rolle benötigt, behalte`,
        );
      }
    }
  }

  /**
   * Returns the current default permissions of a role
   * @param roleName - the role's name
   * @returns array of permission names
   */
  getConfiguredPermissionsForRole(roleName: string): string[] {
    return getPermissionsForRole(roleName);
  }
}
