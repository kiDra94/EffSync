import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { hash, genSalt } from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { RolePermissionsService } from "../roles/role-permissions.service";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private rolePermissionsService: RolePermissionsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const saltRound = 10; // default for web apps: 2^10 rounds
    const salt = await genSalt(saltRound);
    const hashPassword = await hash(createUserDto.password, salt);
    const { password, ...userWithoutPassword } = createUserDto;
    return await this.prisma.users.create({
      data: {
        ...userWithoutPassword,
        password_hash: hashPassword,
      },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.users.findUnique({ where: { email: email } });
  }

  async findByUsername(username: string) {
    return await this.prisma.users.findUnique({
      where: { username: username },
    });
  }

  async findAllForChat() {
    return await this.prisma.users.findMany({
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
      },
      orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
    });
  }

  async findAll() {
    const users = await this.prisma.users.findMany({
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
        user_roles: {
          include: {
            roles: true,
          },
        },
        user_permissions: {
          include: {
            permissions: true,
          },
        },
      },
    });
    return users;
  }

  async findOne(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: id },
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
      },
    });
    if (!user) throw new NotFoundException(`Member with ID ${id} not found`);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return await this.prisma.users.update({
      where: { user_id: id },
      data: updateUserDto,
    });
  }

  async remove(id: number) {
    return await this.prisma.users.delete({ where: { user_id: id } });
  }

  async getUserPermissions(userId: number) {
    const today = new Date();

    // User permissions with validity periods
    const userPermissions = await this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true },
    });

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
    const userRoles = await this.prisma.user_roles.findMany({
      where: { user_id: userId },
      include: {
        roles: {
          include: {
            roles_permissions: {
              include: { permissions: true },
            },
          },
        },
      },
    });

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
    // Check: the user exists
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} nicht gefunden`);
    }

    // Check: the permission exists
    const permission = await this.prisma.permissions.findUnique({
      where: { permission_id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} nicht gefunden`);
    }

    // Check: the user doesn't have this permission yet
    const existing = await this.prisma.user_permissions.findUnique({
      where: {
        user_id_permission_id: {
          user_id: userId,
          permission_id: permissionId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException("User hat diese Permission bereits");
    }

    // Add
    return await this.prisma.user_permissions.create({
      data: {
        user_id: userId,
        permission_id: permissionId,
        valid_from: validFrom || null,
        valid_to: validTo || null,
      },
      include: { permissions: true },
    });
  }

  /**
   * Removes a permission from a user.
   *
   * @param userId - the user ID
   * @param permissionId - the permission ID
   */
  async removePermissionFromUser(userId: number, permissionId: number) {
    const userPerm = await this.prisma.user_permissions.findUnique({
      where: {
        user_id_permission_id: {
          user_id: userId,
          permission_id: permissionId,
        },
      },
    });

    if (!userPerm) {
      throw new NotFoundException("User hat diese Permission nicht");
    }

    return await this.prisma.user_permissions.delete({
      where: {
        user_id_permission_id: {
          user_id: userId,
          permission_id: permissionId,
        },
      },
    });
  }

  /**
   * Assigns a role to a user.
   * Important: all default permissions of the role are added automatically as well!
   *
   * @param userId - the user ID
   * @param roleId - the role ID
   */
  async addRoleToUser(userId: number, roleId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} nicht gefunden`);
    }

    const role = await this.prisma.roles.findUnique({
      where: { role_id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }

    const existing = await this.prisma.user_roles.findUnique({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException("User hat diese Rolle bereits");
    }

    // 1. Assign the role
    const result = await this.prisma.user_roles.create({
      data: {
        user_id: userId,
        role_id: roleId,
      },
      include: {
        roles: {
          include: {
            roles_permissions: {
              include: { permissions: true },
            },
          },
        },
      },
    });

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
    const role = await this.prisma.roles.findUnique({
      where: { role_id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }

    const userRole = await this.prisma.user_roles.findUnique({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException("User hat diese Rolle nicht");
    }

    const criticalRoles = ["Superuser", "Admin"];
    if (role.name && criticalRoles.includes(role.name)) {
      const countWithRole = await this.prisma.user_roles.count({
        where: { role_id: roleId },
      });

      if (countWithRole <= 1) {
        throw new BadRequestException(
          `Kann nicht durchgeführt werden: Es muss mindestens 1 ${role.name} existieren`,
        );
      }
    }

    const result = await this.prisma.user_roles.delete({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId,
        },
      },
      include: {
        roles: true,
      },
    });
    return result;
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

  private extractUniqueRolePermissions(userRoles: any[]): any[] {
    const permissions = new Map();
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
