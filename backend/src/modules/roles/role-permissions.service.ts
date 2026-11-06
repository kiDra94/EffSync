import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ROLE_PERMISSIONS_CONFIG,
  getPermissionsForRole,
} from "../../config/role-permissions.config";

/**
 * Service zur Verwaltung von Rollen-Permissions-Zuordnungen
 * Kümmert sich um die automatische Zuweisung und Verwaltung
 */
@Injectable()
export class RolePermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Gibt alle Permission-IDs für eine Rolle zurück
   * @param roleId - Die Role ID
   * @returns Array von Permission-IDs
   */
  async getPermissionIdsForRole(roleId: number): Promise<number[]> {
    const rolePermissions = await this.prisma.roles_permissions.findMany({
      where: { roles_id: roleId },
      select: { permission_id: true },
    });
    return rolePermissions.map((rp) => rp.permission_id);
  }

  /**
   * Finde Permission-ID nach Name
   * @param permissionName - Der Name der Permission (z.B. 'create_tasks')
   * @returns Die Permission ID oder null
   */
  async getPermissionIdByName(permissionName: string): Promise<number | null> {
    const permission = await this.prisma.permissions.findFirst({
      where: { name: permissionName },
      select: { permission_id: true },
    });
    return permission?.permission_id || null;
  }

  /**
   * Weist alle Standard-Permissions einer Rolle zu einem User zu
   * @param userId - Die User ID
   * @param roleId - Die Role ID
   * @param roleName - Der Name der Rolle (z.B. 'Student')
   */
  async assignDefaultPermissionsForRole(
    userId: number,
    roleId: number,
    roleName: string,
  ): Promise<void> {
    console.log(
      `\n📋 Weisen automatisch Permissions für Rolle "${roleName}" zu User ${userId} zu`,
    );

    // Hole die konfigurierten Permissions für die Rolle
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
        // Finde die Permission-ID
        const permId = await this.getPermissionIdByName(permName);

        if (!permId) {
          console.warn(
            `  ⚠️  Permission "${permName}" nicht in DB gefunden, überspringe`,
          );
          continue;
        }

        // Prüfe ob User bereits diese Permission hat
        const existing = await this.prisma.user_permissions.findUnique({
          where: {
            user_id_permission_id: {
              user_id: userId,
              permission_id: permId,
            },
          },
        });

        if (existing) {
          console.log(
            `  ⊘ Permission "${permName}" existiert bereits, überspringe`,
          );
          skippedCount++;
          continue;
        }

        // Erstelle die Permission
        await this.prisma.user_permissions.create({
          data: {
            user_id: userId,
            permission_id: permId,
            valid_from: new Date(),
            valid_to: null,
          },
        });

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
   * Entfernt Permissions, die von einer Rolle stammen
   * (aber nur wenn User keine andere Rolle mit dieser Permission mehr hat)
   *
   * @param userId - Die User ID
   * @param roleId - Die Role ID die entfernt wird
   */
  async removeRolePermissionsIfNotNeeded(
    userId: number,
    roleId: number,
  ): Promise<void> {
    console.log(
      `\n🗑️  Überprüfe ob Permissions entfernt werden können nach Rollen-Entfernung`,
    );

    // Hole alle Permissions die diese Rolle hatte
    const rolePermissions = await this.prisma.roles_permissions.findMany({
      where: { roles_id: roleId },
      select: { permission_id: true },
    });

    for (const rp of rolePermissions) {
      // Prüfe ob User noch andere Rollen mit diese Permission hat
      const otherRoleWithPerm = await this.prisma.user_roles.findFirst({
        where: {
          user_id: userId,
          roles: {
            roles_permissions: {
              some: {
                permission_id: rp.permission_id,
              },
            },
          },
        },
      });

      if (!otherRoleWithPerm) {
        // User hat keine andere Rolle mit dieser Permission
        try {
          await this.prisma.user_permissions.delete({
            where: {
              user_id_permission_id: {
                user_id: userId,
                permission_id: rp.permission_id,
              },
            },
          });
          console.log(`  ✓ Permission entfernt (keine andere Rolle hat sie)`);
        } catch (error) {
          // Permission existiert vielleicht gar nicht in user_permissions
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
   * Gibt die aktuellen Standard-Permissions einer Rolle zurück
   * @param roleName - Der Name der Rolle
   * @returns Array von Permission-Namen
   */
  getConfiguredPermissionsForRole(roleName: string): string[] {
    return getPermissionsForRole(roleName);
  }
}
