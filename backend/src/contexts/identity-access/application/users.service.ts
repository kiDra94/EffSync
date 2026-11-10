import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { CreateUserInput, UpdateUserInput } from "./user-inputs";
import { hash, genSalt } from "bcrypt";
import { assertUnused } from "./account-uniqueness";
import { UserRepository } from "./ports/user.repository";
import { RoleName } from "../domain/role-permissions";
import { GHOST_USER_ID } from "../domain/ghost-user";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { AccountDeletionRegistry } from "./account-deletion";
import { BCRYPT_COST } from "./password-hashing";
import { withoutPasswordHash } from "./public-user";
import { withProfilePicture } from "../../../shared/application/profile-picture";

/** @public named in UsersController return types (declaration output) */
export interface RolePermissionSummary {
  name: string;
  description: string | null;
  flags: number;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly accountDeletion: AccountDeletionRegistry,
  ) {}

  async create(createUserDto: CreateUserInput) {
    await assertUnused(this.users, createUserDto);
    const salt = await genSalt(BCRYPT_COST);
    const hashPassword = await hash(createUserDto.password, salt);
    const { password, ...userWithoutPassword } = createUserDto;
    // review M35: with the Student role like a registration, so the new
    // account can sign in and use the app (decision I3: roles are the source)
    return this.unitOfWork.run(async () => {
      const user = await this.users.create({
        ...userWithoutPassword,
        password_hash: hashPassword,
      });
      const student = await this.users.findRoleByName(RoleName.STUDENT);
      if (student) await this.users.assignRole(user.user_id, student.role_id);
      return withoutPasswordHash(user);
    });
  }

  async findByEmail(email: string) {
    return await this.users.findByEmail(email);
  }

  async findByUsername(username: string) {
    return await this.users.findByUsername(username);
  }

  async findAllForChat() {
    return (await this.users.findAllForChat()).map(withProfilePicture);
  }

  async findAll() {
    return (await this.users.findAllWithAccess()).map(withProfilePicture);
  }

  async findOne(id: number) {
    const user = await this.users.findSummary(id);
    if (!user) throw new NotFoundException(`Member with ID ${id} not found`);
    return withProfilePicture(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserInput,
    actingUserId: number,
  ) {
    this.assertNotGhost(id);
    await this.assertMayManageAccount(id, actingUserId);
    return withoutPasswordHash(await this.users.update(id, updateUserDto));
  }

  /**
   * Deletes an account by anonymizing it (T10, decision H1): its chats and
   * task work stay under the ghost user, the personal record is deleted.
   * Lock, checks and deletion run in one unit of work.
   */
  async remove(id: number, actingUserId: number) {
    this.assertNotGhost(id);
    if (id === actingUserId) {
      throw new BadRequestException(
        "Das eigene Konto kann nicht gelöscht werden",
      );
    }
    await this.assertMayManageAccount(id, actingUserId);
    return this.unitOfWork.run(async () => {
      if (!(await this.users.lockForDeletion(id))) {
        throw new NotFoundException(`User ${id} nicht gefunden`);
      }
      // e.g. school-organization refuses a teacher still assigned (M22)
      await this.accountDeletion.assertDeletable(id);
      await this.assertNotLastCriticalRoleHolder(id);
      // the other contexts' rows first (tasks, M15), then identity-access's own
      await this.accountDeletion.anonymizeUser(id);
      return withoutPasswordHash(await this.users.anonymizeAndDelete(id));
    });
  }

  private async isSuperuser(userId: number): Promise<boolean> {
    const user = await this.users.findByIdWithRoles(userId);
    return !!user?.user_roles?.some(
      (userRole) => userRole.roles?.name === RoleName.SUPERUSER,
    );
  }

  /**
   * Review M35: only a Superuser changes or deletes a Superuser's account;
   * otherwise an Admin could take it over (new e-mail, password reset).
   */
  private async assertMayManageAccount(userId: number, actingUserId: number) {
    if (
      (await this.isSuperuser(userId)) &&
      !(await this.isSuperuser(actingUserId))
    ) {
      throw new ForbiddenException(
        "Nur ein Superuser darf das Konto eines Superusers ändern",
      );
    }
  }

  /**
   * Review M35: only a Superuser grants or removes the Superuser role;
   * otherwise an Admin could make themselves one and reach the Superuser-only
   * system configuration.
   */
  private async assertMayGrant(roleName: string | null, actingUserId: number) {
    if (
      roleName === RoleName.SUPERUSER &&
      !(await this.isSuperuser(actingUserId))
    ) {
      throw new ForbiddenException(
        "Nur ein Superuser darf die Superuser-Rolle vergeben oder entziehen",
      );
    }
  }

  // the same rule as removeRoleFromUser: one Superuser and one Admin remain
  private async assertNotLastCriticalRoleHolder(userId: number) {
    const criticalRoles: string[] = [RoleName.SUPERUSER, RoleName.ADMIN];
    for (const { role_id, roles } of await this.users.findRolesWithPermissions(
      userId,
    )) {
      if (
        criticalRoles.includes(roles.name ?? "") &&
        (await this.users.countUsersWithRole(role_id)) <= 1
      ) {
        throw new BadRequestException(
          `Kann nicht durchgeführt werden: Es muss mindestens 1 ${roles.name} existieren`,
        );
      }
    }
  }

  // the ghost user's name stands for every deleted account (M14)
  private assertNotGhost(userId: number) {
    if (userId === GHOST_USER_ID) {
      throw new BadRequestException(
        "Der Ghost-User kann nicht geändert werden",
      );
    }
  }

  async getUserPermissions(userId: number) {
    const today = new Date();

    // User permissions with validity periods
    const userPermissions = await this.users.findPermissionsOfUser(userId);

    // Filter by validity date
    const validPermissions = userPermissions
      .filter((up) => {
        if (up.valid_from && new Date(up.valid_from) > today) return false; // Not valid yet
        if (up.valid_to && new Date(up.valid_to) < today) return false; // Expired
        return true;
      })
      .map((up) => ({
        name: up.permissions.name,
        description: up.permissions.description,
        flags: up.permissions.flags,
        valid_from: up.valid_from,
        valid_to: up.valid_to,
        status: this.getPermissionStatus(up.valid_from, up.valid_to, today),
      }));

    return validPermissions;
  }

  async getUserRoles(userId: number) {
    const userRoles = await this.users.findRolesWithPermissions(userId);

    return userRoles.map((ur) => ({
      role_id: ur.role_id,
      name: ur.roles.name,
      permissions: ur.roles.roles_permissions.map((rp) => ({
        name: rp.permissions.name,
        description: rp.permissions.description,
        flags: rp.permissions.flags,
      })),
    }));
  }

  async getUserPermissionsAndRoles(userId: number) {
    const userPermissions = await this.getUserPermissions(userId);
    const userRoles = await this.getUserRoles(userId);

    return {
      userId,
      directPermissions: userPermissions,
      roles: userRoles,
      rolePermissions: this.extractUniqueRolePermissions(userRoles),
    };
  }

  /**
   * Adds a new permission for a user (with optional validity period).
   *
   * @param userId - the user ID
   * @param permissionId - the permission ID
   * @param validFrom - valid from (optional, null = immediately)
   * @param validTo - valid until (optional, null = unlimited)
   */
  async addPermissionToUser(
    userId: number,
    permissionId: number,
    validFrom?: Date | null,
    validTo?: Date | null,
  ) {
    this.assertNotGhost(userId);
    // Check: the user exists
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} nicht gefunden`);
    }

    // Check: the permission exists
    const permission = await this.users.findPermissionById(permissionId);

    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} nicht gefunden`);
    }

    // Check: the user doesn't have this permission yet
    const existing = await this.users.findUserPermission(userId, permissionId);

    if (existing) {
      throw new BadRequestException("User hat diese Permission bereits");
    }

    // Add
    return await this.users.grantPermission(
      userId,
      permissionId,
      validFrom || null,
      validTo || null,
    );
  }

  /**
   * Removes a permission from a user.
   *
   * @param userId - the user ID
   * @param permissionId - the permission ID
   */
  async removePermissionFromUser(userId: number, permissionId: number) {
    const userPerm = await this.users.findUserPermission(userId, permissionId);

    if (!userPerm) {
      throw new NotFoundException("User hat diese Permission nicht");
    }

    return await this.users.revokePermission(userId, permissionId);
  }

  /**
   * Assigns a role to a user. Its permissions count through the role, for as
   * long as the user has it (decision I3: no copies into the user's own
   * grants, so a change to the role reaches the user at once).
   *
   * @param userId - the user ID
   * @param roleId - the role ID
   */
  async addRoleToUser(userId: number, roleId: number, actingUserId: number) {
    this.assertNotGhost(userId);
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} nicht gefunden`);
    }

    const role = await this.users.findRoleById(roleId);

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }
    await this.assertMayGrant(role.name, actingUserId);

    const existing = await this.users.findUserRole(userId, roleId);

    if (existing) {
      throw new BadRequestException("User hat diese Rolle bereits");
    }

    return this.users.assignRoleWithDetails(userId, roleId);
  }

  /**
   * Removes a role from a user.
   *
   * Safety:
   * - at least 1 Superuser/Admin must remain
   * - if this is the last one, the role can't be removed
   *
   * @param userId - the user ID
   * @param roleId - the role ID
   */
  async removeRoleFromUser(
    userId: number,
    roleId: number,
    actingUserId: number,
  ) {
    const role = await this.users.findRoleById(roleId);

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }

    await this.assertMayGrant(role.name, actingUserId);

    const userRole = await this.users.findUserRole(userId, roleId);

    if (!userRole) {
      throw new NotFoundException("User hat diese Rolle nicht");
    }

    const criticalRoles: string[] = [RoleName.SUPERUSER, RoleName.ADMIN];
    if (role.name && criticalRoles.includes(role.name)) {
      const countWithRole = await this.users.countUsersWithRole(roleId);

      if (countWithRole <= 1) {
        throw new BadRequestException(
          `Kann nicht durchgeführt werden: Es muss mindestens 1 ${role.name} existieren`,
        );
      }
    }

    return await this.users.removeRole(userId, roleId);
  }

  private getPermissionStatus(
    valid_from: Date | null,
    valid_to: Date | null,
    today: Date,
  ): string {
    if (valid_from && new Date(valid_from) > today) return "NOT_YET_VALID";
    if (valid_to && new Date(valid_to) < today) return "EXPIRED";
    return "VALID";
  }

  private extractUniqueRolePermissions(
    userRoles: Array<{ permissions: RolePermissionSummary[] }>,
  ): RolePermissionSummary[] {
    const permissions = new Map<string, RolePermissionSummary>();
    userRoles.forEach((role) => {
      role.permissions.forEach((perm) => {
        if (!permissions.has(perm.name)) {
          permissions.set(perm.name, perm);
        }
      });
    });
    return Array.from(permissions.values());
  }
}
