import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import {
  PermissionRepository,
  RolePermissionRepository,
  RoleRepository,
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
}

/** RolePermissionRepository on Prisma (queries of RolePermissionsService before M11). */
@Injectable()
export class PrismaRolePermissionRepository extends RolePermissionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPermissionIdsOfRole(roleId: number) {
    const rows = await this.prisma.roles_permissions.findMany({
      where: { roles_id: roleId },
      select: { permission_id: true },
    });
    return rows.map((row) => row.permission_id);
  }

  async findPermissionIdByName(name: string) {
    const permission = await this.prisma.permissions.findFirst({
      where: { name },
      select: { permission_id: true },
    });
    return permission?.permission_id || null;
  }

  findUserPermission(userId: number, permissionId: number) {
    return this.prisma.user_permissions.findUnique({
      where: {
        user_id_permission_id: { user_id: userId, permission_id: permissionId },
      },
    });
  }

  grantPermissionFromNow(userId: number, permissionId: number) {
    return this.prisma.user_permissions.create({
      data: {
        user_id: userId,
        permission_id: permissionId,
        valid_from: new Date(),
        valid_to: null,
      },
    });
  }

  findOtherRoleGranting(userId: number, permissionId: number) {
    return this.prisma.user_roles.findFirst({
      where: {
        user_id: userId,
        roles: {
          roles_permissions: { some: { permission_id: permissionId } },
        },
      },
    });
  }

  revokePermission(userId: number, permissionId: number) {
    return this.prisma.user_permissions.delete({
      where: {
        user_id_permission_id: { user_id: userId, permission_id: permissionId },
      },
    });
  }
}
