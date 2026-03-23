import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PermissionChecker Service
 * 
 * Unterscheide zwischen:
 * - ROLLE: Binär, kein Zeitlimit (z.B. "Lehrer", "Admin")
 * - PERMISSION: Binär mit Flags (READ=4, WRITE=2, EXECUTE=1), mit Zeitlimit
 */

export enum PermissionFlag {
  READ = 4,    // 100
  WRITE = 2,   // 010
  EXECUTE = 1, // 001
}

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Prüfe, ob User eine ROLLE hat (einfach & schnell)
   * Rollen haben KEINE Zeitlimits!
   */
  async hasRole(userId: number, roleName: string): Promise<boolean> {
    const userRole = await this.prisma.user_roles.findFirst({
      where: {
        user_id: userId,
        roles: { name: roleName }
      },
      include: { roles: true }
    });

    return !!userRole;
  }

  /**
   * Hole alle Rollen eines Users
   */
  async getUserRoles(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.user_roles.findMany({
      where: { user_id: userId },
      include: { roles: true }
    });

    return userRoles.map(ur => ur.roles.name || 'Unknown').filter(Boolean);
  }

  /**
   * Prüfe, ob User eine PERMISSION hat (mit Zeit- & Flag-Validierung)
   * 
   * @param userId - User ID
   * @param permissionName - z.B. 'create_task', 'edit_grades'
   * @param requiredFlag - Benötigte Flag (READ, WRITE, EXECUTE)
   * @returns true wenn Permission aktiv und Flag vorhanden
   */
  async hasPermission(
    userId: number,
    permissionName: string,
    requiredFlag: PermissionFlag = PermissionFlag.READ
  ): Promise<boolean> {
    const userPermission = await this.prisma.user_permissions.findFirst({
      where: {
        user_id: userId,
        permissions: { name: permissionName }
      },
      include: { permissions: true }
    });

    if (!userPermission) {
      return false;
    }

    // Prüfe Zeitfenster
    const now = new Date();
    const isTimeValid =
      (!userPermission.valid_from || now >= userPermission.valid_from) &&
      (!userPermission.valid_to || now <= userPermission.valid_to);

    if (!isTimeValid) {
      return false;
    }

    // Prüfe Flags (wie Unix: bitweises AND)
    const hasFlagBits =
      (userPermission.permissions.flags & requiredFlag) === requiredFlag;

    return hasFlagBits;
  }

  /**
   * Prüfe mehrere Permissions (OR Logik - min. eine muss wahr sein)
   */
  async hasAnyPermission(
    userId: number,
    permissionNames: string[],
    requiredFlag: PermissionFlag = PermissionFlag.READ
  ): Promise<boolean> {
    for (const permName of permissionNames) {
      if (await this.hasPermission(userId, permName, requiredFlag)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Prüfe mehrere Permissions (AND Logik - alle müssen wahr sein)
   */
  async hasAllPermissions(
    userId: number,
    permissionNames: string[],
    requiredFlag: PermissionFlag = PermissionFlag.READ
  ): Promise<boolean> {
    for (const permName of permissionNames) {
      if (!(await this.hasPermission(userId, permName, requiredFlag))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Hole alle aktiven Permissions des Users (mit Zeitprüfung)
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
      include: { permissions: true }
    });

    const now = new Date();

    return permissions.map(up => ({
      name: up.permissions.name,
      flags: up.permissions.flags,
      valid_from: up.valid_from,
      valid_to: up.valid_to,
      isExpired:
        up.valid_to !== null && now > up.valid_to
    }));
  }

  /**
   * Gebe expirierte Permissions aus (für Benachrichtigungen)
   */
  async getExpiringPermissions(userId: number, daysUntilExpiry: number = 7): Promise<
    Array<{
      name: string;
      valid_to: Date;
      daysRemaining: number;
    }>
  > {
    const permissions = await this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true }
    });

    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);

    return permissions
      .filter(
        up =>
          up.valid_to &&
          up.valid_to > now &&
          up.valid_to <= expiryThreshold
      )
      .map(up => ({
        name: up.permissions.name,
        valid_to: up.valid_to!,
        daysRemaining: Math.ceil(
          (up.valid_to!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
      }));
  }
}
