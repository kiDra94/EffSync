import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import {
  PermissionRepository,
  RoleRepository,
  type RolePermissionEntry,
} from "../../application/ports/access.repositories";
import type { PermissionGrant } from "../../application/ports/identity-records";

const PERMISSION_ASSIGNMENTS = {
  roles_permissions: { include: { roles: true } },
  user_permissions: true,
} as const;

const ROLE_PERMISSIONS = {
  roles_permissions: { include: { permissions: true } },
} as const;

/** PermissionRepository on Prisma; the queries are the ones PermissionsService made before M11. */
@Injectable()
export class PrismaPermissionRepository extends PermissionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUserIdsWithRoles(userIds: number[], roleNames: readonly string[]) {
    const rows = await this.prisma.user_roles.findMany({
      where: {
        user_id: { in: userIds },
        roles: {
          OR: roleNames.map((name) => ({
            name: { equals: name, mode: "insensitive" as const },
          })),
        },
      },
      select: { user_id: true },
    });
    return rows.map((row) => row.user_id);
  }

  countUserRolesNamed(userId: number, roleNames: readonly string[]) {
    return this.prisma.user_roles.count({
      where: {
        user_id: userId,
        // case-insensitive, like isRoleIn for the JWT role (Prisma ignores `mode` on `in`)
        roles: {
          OR: roleNames.map((name) => ({
            name: { equals: name, mode: "insensitive" as const },
          })),
        },
      },
    });
  }

  findUserRoles(userId: number) {
    return this.prisma.user_roles.findMany({
      where: { user_id: userId },
      include: { roles: true },
    });
  }

  findGrants(userId: number, permissionNames: string[]) {
    if (permissionNames.length === 0) return Promise.resolve([]);
    const names = Prisma.join(permissionNames);
    // per name the first row, as findFirst found it before M37, but in a
    // fixed order (names aren't unique, a user can have several roles)
    return this.prisma.$queryRaw<PermissionGrant[]>(Prisma.sql`
      (SELECT DISTINCT ON (p.name)
              p.name, 'user' AS via, p.flags, up.valid_from, up.valid_to
       FROM user_permissions up
       JOIN permissions p ON p.permission_id = up.permission_id
       WHERE up.user_id = ${userId} AND p.name IN (${names})
       ORDER BY p.name, p.permission_id)
      UNION ALL
      (SELECT DISTINCT ON (p.name)
              p.name, 'role' AS via, p.flags,
              NULL::timestamp AS valid_from, NULL::timestamp AS valid_to
       FROM user_roles ur
       JOIN roles_permissions rp ON rp.roles_id = ur.role_id
       JOIN permissions p ON p.permission_id = rp.permission_id
       WHERE ur.user_id = ${userId} AND p.name IN (${names})
       ORDER BY p.name, ur.role_id, p.permission_id)`);
  }

  findPermissionsOfUser(userId: number) {
    return this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });
  }

  findAllPermissions() {
    return this.prisma.permissions.findMany({
      include: PERMISSION_ASSIGNMENTS,
      orderBy: { name: "asc" },
    });
  }

  findPermission(permissionId: number) {
    return this.prisma.permissions.findUnique({
      where: { permission_id: permissionId },
      include: PERMISSION_ASSIGNMENTS,
    });
  }
}

/** RoleRepository on Prisma (queries of RolesService before M11). */
@Injectable()
export class PrismaRoleRepository extends RoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findAll() {
    return this.prisma.roles.findMany({ include: ROLE_PERMISSIONS });
  }

  findOne(roleId: number) {
    return this.prisma.roles.findUnique({
      where: { role_id: roleId },
      include: ROLE_PERMISSIONS,
    });
  }

  findPermissionsByIds(permissionIds: number[]) {
    return this.prisma.permissions.findMany({
      where: { permission_id: { in: permissionIds } },
      select: { permission_id: true, name: true, flags: true },
    });
  }

  async replacePermissions(roleId: number, entries: RolePermissionEntry[]) {
    await this.prisma.$transaction([
      this.prisma.roles_permissions.deleteMany({ where: { roles_id: roleId } }),
      this.prisma.roles_permissions.createMany({
        data: entries.map((e) => ({
          roles_id: roleId,
          permission_id: e.permission_id,
        })),
      }),
      // only flags that were sent, and only where they differ: a stale
      // screen doesn't undo another change, nor touch updated_at (review M35)
      ...entries
        .filter((e) => e.flags !== undefined)
        .map((e) =>
          this.prisma.permissions.updateMany({
            where: { permission_id: e.permission_id, flags: { not: e.flags } },
            data: { flags: e.flags },
          }),
        ),
    ]);
  }
}
