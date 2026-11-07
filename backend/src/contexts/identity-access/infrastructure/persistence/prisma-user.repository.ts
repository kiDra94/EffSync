import { Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  NewUser,
  UserChanges,
  UserRepository,
} from "../../application/ports/user.repository";

const WITH_ROLES = { user_roles: { include: { roles: true } } } as const;
const ROLE_WITH_PERMISSIONS = {
  roles: {
    include: { roles_permissions: { include: { permissions: true } } },
  },
} as const;

/** UserRepository on Prisma; the queries are the ones UsersService/AuthService made before M11. */
@Injectable()
export class PrismaUserRepository extends UserRepository {
  // the unit of work is optional, so the M2 specs build the repository unchanged
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly unitOfWork?: PrismaUnitOfWork,
  ) {
    super();
  }

  create(data: NewUser) {
    return this.prisma.users.create({ data });
  }

  findById(userId: number) {
    return this.prisma.users.findUnique({ where: { user_id: userId } });
  }

  findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { email: email } });
  }

  findByUsername(username: string) {
    return this.prisma.users.findUnique({ where: { username: username } });
  }

  findByIdWithRoles(userId: number) {
    return this.prisma.users.findUnique({
      where: { user_id: userId },
      include: WITH_ROLES,
    });
  }

  findByUsernameWithRoles(username: string) {
    return this.prisma.users.findFirst({
      where: { username },
      include: WITH_ROLES,
    });
  }

  findByEmailWithRoles(email: string) {
    return this.prisma.users.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: WITH_ROLES,
    });
  }

  findByGoogleIdWithRoles(googleId: string) {
    return this.prisma.users.findUnique({
      where: { google_id: googleId },
      include: WITH_ROLES,
    });
  }

  async linkGoogleId(userId: number, googleId: string) {
    await this.prisma.users.update({
      where: { user_id: userId },
      data: { google_id: googleId },
    });
  }

  findSummary(userId: number) {
    return this.prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
      },
    });
  }

  findAllForChat() {
    return this.prisma.users.findMany({
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
      },
      orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
    });
  }

  findAllWithAccess() {
    return this.prisma.users.findMany({
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
        user_roles: { include: { roles: true } },
        user_permissions: { include: { permissions: true } },
      },
    });
  }

  update(userId: number, changes: UserChanges) {
    return this.prisma.users.update({
      where: { user_id: userId },
      data: changes,
    });
  }

  // joins an open unit of work: the password change revokes sessions with it (M13)
  updatePasswordHash(userId: number, passwordHash: string) {
    return (this.unitOfWork?.client() ?? this.prisma).users.update({
      where: { user_id: userId },
      data: { password_hash: passwordHash },
    });
  }

  delete(userId: number) {
    return this.prisma.users.delete({ where: { user_id: userId } });
  }

  findRoleById(roleId: number) {
    return this.prisma.roles.findUnique({ where: { role_id: roleId } });
  }

  findRoleByName(name: string) {
    return this.prisma.roles.findFirst({ where: { name } });
  }

  findUserRole(userId: number, roleId: number) {
    return this.prisma.user_roles.findUnique({
      where: { user_id_role_id: { user_id: userId, role_id: roleId } },
    });
  }

  assignRole(userId: number, roleId: number) {
    return this.prisma.user_roles.create({
      data: { user_id: userId, role_id: roleId },
    });
  }

  assignRoleWithPermissions(userId: number, roleId: number) {
    return this.prisma.user_roles.create({
      data: { user_id: userId, role_id: roleId },
      include: ROLE_WITH_PERMISSIONS,
    });
  }

  countUsersWithRole(roleId: number) {
    return this.prisma.user_roles.count({ where: { role_id: roleId } });
  }

  removeRole(userId: number, roleId: number) {
    return this.prisma.user_roles.delete({
      where: { user_id_role_id: { user_id: userId, role_id: roleId } },
      include: { roles: true },
    });
  }

  findRolesWithPermissions(userId: number) {
    return this.prisma.user_roles.findMany({
      where: { user_id: userId },
      include: ROLE_WITH_PERMISSIONS,
    });
  }

  findPermissionById(permissionId: number) {
    return this.prisma.permissions.findUnique({
      where: { permission_id: permissionId },
    });
  }

  findUserPermission(userId: number, permissionId: number) {
    return this.prisma.user_permissions.findUnique({
      where: {
        user_id_permission_id: { user_id: userId, permission_id: permissionId },
      },
    });
  }

  grantPermission(
    userId: number,
    permissionId: number,
    validFrom: Date | null,
    validTo: Date | null,
  ) {
    return this.prisma.user_permissions.create({
      data: {
        user_id: userId,
        permission_id: permissionId,
        valid_from: validFrom,
        valid_to: validTo,
      },
      include: { permissions: true },
    });
  }

  revokePermission(userId: number, permissionId: number) {
    return this.prisma.user_permissions.delete({
      where: {
        user_id_permission_id: { user_id: userId, permission_id: permissionId },
      },
    });
  }

  findPermissionsOfUser(userId: number) {
    return this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });
  }
}
