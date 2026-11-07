import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { CreateUserInput, UpdateUserInput } from "./user-inputs";
import { hash, genSalt } from "bcrypt";
import { UserRepository } from "./ports/user.repository";
import { RoleName } from "../domain/role-permissions";
import { GHOST_USER_ID } from "../domain/ghost-user";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { BCRYPT_COST } from "./password-hashing";
import { withoutPasswordHash } from "./public-user";

/** @public named in UsersController return types (declaration output) */
export interface RolePermissionSummary {
  name: string;
  description: string | null;
  flags: number;
}
import { RolePermissionsService } from "./role-permissions.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private rolePermissionsService: RolePermissionsService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(createUserDto: CreateUserInput) {
    const salt = await genSalt(BCRYPT_COST);
    const hashPassword = await hash(createUserDto.password, salt);
    const { password, ...userWithoutPassword } = createUserDto;
    const user = await this.users.create({
      ...userWithoutPassword,
      password_hash: hashPassword,
    });
    return withoutPasswordHash(user);
  }

  async findByEmail(email: string) {
    return await this.users.findByEmail(email);
  }

  async findByUsername(username: string) {
    return await this.users.findByUsername(username);
  }

  async findAllForChat() {
    return await this.users.findAllForChat();
  }

  async findAll() {
    return await this.users.findAllWithAccess();
  }

  async findOne(id: number) {
    const user = await this.users.findSummary(id);
    if (!user) throw new NotFoundException(`Member with ID ${id} not found`);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserInput) {
    this.assertNotGhost(id);
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
    return this.unitOfWork.run(async () => {
      if (!(await this.users.lockForDeletion(id))) {
        throw new NotFoundException(`User ${id} nicht gefunden`);
      }
      if ((await this.users.countTeacherAssignments(id)) > 0) {
        throw new ConflictException(
          "Die Lehrkraft ist noch Klassenvorstand, unterrichtet eine Klasse oder hat Unterrichtsstunden. Bitte zuerst neu zuweisen.",
        );
      }
      await this.assertNotLastCriticalRoleHolder(id);
      return withoutPasswordHash(await this.users.anonymizeAndDelete(id));
    });
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
   * Assigns a role to a user.
   * Important: all default permissions of the role are added automatically as well!
   *
   * @param userId - the user ID
   * @param roleId - the role ID
   */
  async addRoleToUser(userId: number, roleId: number) {
    this.assertNotGhost(userId);
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} nicht gefunden`);
    }

    const role = await this.users.findRoleById(roleId);

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }

    const existing = await this.users.findUserRole(userId, roleId);

    if (existing) {
      throw new BadRequestException("User hat diese Rolle bereits");
    }

    // 1. Assign the role
    const result = await this.users.assignRoleWithPermissions(userId, roleId);

    // 2. Add the role's default permissions automatically
    try {
      if (role.name) {
        await this.rolePermissionsService.assignDefaultPermissionsForRole(
          userId,
          roleId,
          role.name,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        "Fehler beim Hinzufügen der Standard-Permissions:",
        errorMessage,
      );
      // Don't fail if the permissions can't be added
      // The role is already assigned
    }

    return result;
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
  async removeRoleFromUser(userId: number, roleId: number) {
    const role = await this.users.findRoleById(roleId);

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }

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
