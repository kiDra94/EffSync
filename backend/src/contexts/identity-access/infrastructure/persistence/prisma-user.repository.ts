import { Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { GHOST_USER, GHOST_USER_ID } from "../../domain/ghost-user";
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

  // the ghost user (M14) is left out of both lists
  findAllForChat() {
    return this.prisma.users.findMany({
      where: { user_id: { not: GHOST_USER_ID } },
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
      where: { user_id: { not: GHOST_USER_ID } },
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

  // the account deletion's queries join the unit of work (M14)
  private db() {
    return this.unitOfWork?.client() ?? this.prisma;
  }

  async lockForDeletion(userId: number) {
    const db = this.db();
    // FK inserts (a new class teacher, a new message) take KEY SHARE locks on
    // these rows, so they wait for the deletion; so does a second deletion
    await db.$queryRaw`SELECT 1 FROM "users" WHERE "user_id" = ${userId} FOR UPDATE`;
    await db.$queryRaw`SELECT 1 FROM "teachers" WHERE "teacher_id" = ${userId} FOR UPDATE`;
    return db.users.findUnique({ where: { user_id: userId } });
  }

  async countTeacherAssignments(userId: number) {
    const db = this.db();
    const [headOf, teaches, slots] = await Promise.all([
      db.classes.count({ where: { head_teacher_id: userId } }),
      db.classes_teachers.count({ where: { teacher_id: userId } }),
      db.lesson_slots.count({ where: { teacher_id: userId } }),
    ]);
    return headOf + teaches + slots;
  }

  async anonymizeAndDelete(userId: number) {
    const tx = this.db();
    const user = await tx.users.findUniqueOrThrow({
      where: { user_id: userId },
      select: { firstname: true, lastname: true, username: true },
    });

    // the user's own notes, with their shares and document links
    const ownNotes = { where: { notes: { created_by: userId } } };
    await tx.note_documents.deleteMany(ownNotes);
    await tx.notes_users.deleteMany(ownNotes);
    await tx.notes.deleteMany({ where: { created_by: userId } });

    // uploads that belong to no task are private files: deleted
    const privateDocuments = {
      added_by: userId,
      task_documents: { none: {} },
    };
    await tx.document_shares.deleteMany({
      where: { documents: privateDocuments },
    });
    await tx.note_documents.deleteMany({
      where: { documents: privateDocuments },
    });
    await tx.documents.deleteMany({ where: privateDocuments });

    // shared content: the chat history stays, under the ghost user (the task
    // tables are task-management's AccountDeletionParticipant, M15)
    const toGhost = { user_id: GHOST_USER_ID };
    await tx.chat_messages.updateMany({
      where: { user_id: userId },
      data: toGhost,
    });
    const createdBy = { created_by: GHOST_USER_ID };
    await tx.chat_rooms.updateMany({
      where: { created_by: userId },
      data: createdBy,
    });
    await tx.documents.updateMany({
      where: { added_by: userId },
      data: { added_by: GHOST_USER_ID },
    });
    await tx.documents.updateMany({
      where: { graded_by: userId },
      data: { graded_by: GHOST_USER_ID },
    });

    // other members' chat notifications start with the sender's name
    // (chat-messages.service.ts); the name goes, the message stays
    const senderName =
      `${user.firstname} ${user.lastname}`.trim() || user.username;
    const prefix = `💬 ${senderName}:`;
    const ghostPrefix = `💬 ${GHOST_USER.firstname} ${GHOST_USER.lastname}:`;
    await tx.$executeRaw`UPDATE "notifications" SET "text" = ${ghostPrefix} || substr("text", char_length(${prefix}) + 1) WHERE "type" = 'chat_message' AND starts_with("text", ${prefix})`;

    // references that mean nothing for a ghost
    await tx.teachers.updateMany({
      where: { supervisor_id: userId },
      data: { supervisor_id: null },
    });

    // personal rows
    const ownRows = { where: { user_id: userId } };
    await tx.user_roles.deleteMany(ownRows);
    await tx.chat_room_users.deleteMany(ownRows);
    await tx.document_shares.deleteMany(ownRows);
    await tx.notifications.deleteMany(ownRows);
    await tx.notes_users.deleteMany(ownRows);
    await tx.students.deleteMany({ where: { student_id: userId } });
    await tx.teachers.deleteMany({ where: { teacher_id: userId } });

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
