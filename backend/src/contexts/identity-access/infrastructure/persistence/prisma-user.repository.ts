import { Prisma } from "@prisma/client";
import { ConflictException, Injectable, Optional } from "@nestjs/common";
import { AVATAR_VERSION } from "../../../../shared/application/profile-picture";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { GHOST_USER_ID } from "../../domain/ghost-user";
import {
  NewUser,
  SessionUser,
  UserChanges,
  UserRepository,
} from "../../application/ports/user.repository";

// by role id, so login and JwtStrategy take the same first role (review M37)
const WITH_ROLES = {
  user_roles: { include: { roles: true }, orderBy: { role_id: "asc" } },
} as const;
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
    return takenAsConflict(this.prisma.users.create({ data }));
  }

  async isTaken(username: string, email: string) {
    return !!(await this.prisma.users.findFirst({
      where: {
        OR: [{ username }, { email: { equals: email, mode: "insensitive" } }],
      },
      select: { user_id: true },
    }));
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

  async findSessionUser(userId: number) {
    const [user] = await this.prisma.$queryRaw<SessionUser[]>`
      SELECT u.email, u.firstname, u.lastname,
             (SELECT r.name FROM user_roles ur
              JOIN roles r ON r.role_id = ur.role_id
              WHERE ur.user_id = u.user_id
              ORDER BY ur.role_id LIMIT 1) AS role
      FROM users u WHERE u.user_id = ${userId}`;
    return user ?? null;
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
        user_avatars: AVATAR_VERSION,
      },
    });
  }

  // the ghost user (M14) is left out of both lists
  findAllForChat() {
    return this.prisma.users.findMany({
      where: { user_id: { not: GHOST_USER_ID } },
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        user_avatars: AVATAR_VERSION,
      },
      orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
    });
  }

  findAllWithAccess() {
    return this.prisma.users.findMany({
      where: { user_id: { not: GHOST_USER_ID } },
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
        user_avatars: AVATAR_VERSION,
        user_roles: { include: { roles: true } },
        user_permissions: { include: { permissions: true } },
      },
    });
  }

  update(userId: number, changes: UserChanges) {
    return takenAsConflict(
      this.prisma.users.update({ where: { user_id: userId }, data: changes }),
    );
  }

  // joins an open unit of work: the password change revokes sessions with it (M13)
  updatePasswordHash(userId: number, passwordHash: string) {
    return (this.unitOfWork?.client() ?? this.prisma).users.update({
      where: { user_id: userId },
      data: { password_hash: passwordHash },
    });
  }

  // the account deletion's queries join the unit of work (M14)
  private db() {
    return this.unitOfWork?.client() ?? this.prisma;
  }

  async lockForDeletion(userId: number) {
    const db = this.db();
    // FK inserts (a new message, a new assignment) take KEY SHARE locks on
    // the row, so they wait for the deletion; so does a second deletion (the
    // teacher row is school-organization's lock, M22)
    await db.$queryRaw`SELECT 1 FROM "users" WHERE "user_id" = ${userId} FOR UPDATE`;
    return db.users.findUnique({ where: { user_id: userId } });
  }

  async anonymizeAndDelete(userId: number) {
    const tx = this.db();
    // tasks, documents, notes, chats, school profiles and notifications are
    // their contexts' AccountDeletionParticipants (M15, M19, M20, M22, M23)
    await tx.user_roles.deleteMany({ where: { user_id: userId } });

    // user_permissions, email_*, refresh_tokens and task_members cascade
    return tx.users.delete({ where: { user_id: userId } });
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
    return this.db().user_roles.count({ where: { role_id: roleId } });
  }

  removeRole(userId: number, roleId: number) {
    return this.prisma.user_roles.delete({
      where: { user_id_role_id: { user_id: userId, role_id: roleId } },
      include: { roles: true },
    });
  }

  findRolesWithPermissions(userId: number) {
    return this.db().user_roles.findMany({
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

/**
 * A taken username or e-mail (the unique index, P2002) is a 409, also when
 * two requests race past the check (review M29).
 */
async function takenAsConflict<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException(
        "Benutzername oder E-Mail-Adresse ist bereits vergeben",
      );
    }
    throw error;
  }
}
