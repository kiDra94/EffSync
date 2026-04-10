import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { hash, genSalt } from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const saltRound = 10; // standard wert fuer web 2^10 Rounds
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

  async findAll() {
    console.log('📋 UsersService - findAll() called');
    const users = await this.prisma.users.findMany({
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
        user_roles: {
          include: {
            roles: true
          }
        },
        user_permissions: {
          include: {
            permissions: true
          }
        }
      }
    });
    console.log(`✅ UsersService - findAll() returned ${users.length} users`);
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
      }
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
    
    // User Permissions mit Zeitvalidierung
    const userPermissions = await this.prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: { permissions: true }
    });

    // Filtern nach Gültigkeitsdatum
    const validPermissions = userPermissions
      .filter(up => {
        if (up.valid_from && new Date(up.valid_from) > today) return false; // Noch nicht gültig
        if (up.valid_to && new Date(up.valid_to) < today) return false; // Abgelaufen
        return true;
      })
      .map(up => ({
        name: up.permissions.name,
        description: up.permissions.description,
        flags: up.permissions.flags,
        valid_from: up.valid_from,
        valid_to: up.valid_to,
        status: this.getPermissionStatus(up.valid_from, up.valid_to, today)
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
              include: { permissions: true }
            }
          }
        }
      }
    });

    return userRoles.map(ur => ({
      role_id: ur.role_id,
      name: ur.roles.name,
      permissions: ur.roles.roles_permissions.map(rp => ({
        name: rp.permissions.name,
        description: rp.permissions.description,
        flags: rp.permissions.flags
      }))
    }));
  }

  async getUserPermissionsAndRoles(userId: number) {
    const userPermissions = await this.getUserPermissions(userId);
    const userRoles = await this.getUserRoles(userId);

    return {
      userId,
      directPermissions: userPermissions,
      roles: userRoles,
      rolePermissions: this.extractUniqueRolePermissions(userRoles)
    };
  }

  /**
   * Fügt eine neue Permission für einen User hinzu (mit optionalen Zeitlimits).
   * 
   * @param userId - Die User ID
   * @param permissionId - Die Permission ID
   * @param validFrom - Ab wann gültig (optional, null = sofort)
   * @param validTo - Bis wann gültig (optional, null = unbegrenzt)
   */
  async addPermissionToUser(
    userId: number,
    permissionId: number,
    validFrom?: Date | null,
    validTo?: Date | null
  ) {
    // Prüfe: User existiert
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} nicht gefunden`);
    }

    // Prüfe: Permission existiert
    const permission = await this.prisma.permissions.findUnique({
      where: { permission_id: permissionId }
    });

    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} nicht gefunden`);
    }

    // Prüfe: User hat diese Permission nicht bereits
    const existing = await this.prisma.user_permissions.findUnique({
      where: {
        user_id_permission_id: {
          user_id: userId,
          permission_id: permissionId
        }
      }
    });

    if (existing) {
      throw new BadRequestException('User hat diese Permission bereits');
    }

    // Hinzufügen
    return await this.prisma.user_permissions.create({
      data: {
        user_id: userId,
        permission_id: permissionId,
        valid_from: validFrom || null,
        valid_to: validTo || null
      },
      include: { permissions: true }
    });
  }

  /**
   * Entfernt eine Permission von einem User.
   * 
   * @param userId - Die User ID
   * @param permissionId - Die Permission ID
   */
  async removePermissionFromUser(
    userId: number,
    permissionId: number
  ) {
    const userPerm = await this.prisma.user_permissions.findUnique({
      where: {
        user_id_permission_id: {
          user_id: userId,
          permission_id: permissionId
        }
      }
    });

    if (!userPerm) {
      throw new NotFoundException('User hat diese Permission nicht');
    }

    return await this.prisma.user_permissions.delete({
      where: {
        user_id_permission_id: {
          user_id: userId,
          permission_id: permissionId
        }
      }
    });
  }

  /**
   * Weist eine Rolle einem User zu.
   * 
   * @param userId - Die User ID
   * @param roleId - Die Role ID
   */
  async addRoleToUser(userId: number, roleId: number) {
    console.log(`➕ addRoleToUser: userId=${userId}, roleId=${roleId}`);

    // Prüfe: User existiert
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} nicht gefunden`);
    }
    console.log(`  ├─ User found: ${user.username}`);

    // Prüfe: Role existiert
    const role = await this.prisma.roles.findUnique({
      where: { role_id: roleId }
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }
    console.log(`  ├─ Role found: ${role.name}`);

    // Prüfe: User hat diese Rolle nicht bereits
    const existing = await this.prisma.user_roles.findUnique({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId
        }
      }
    });

    if (existing) {
      throw new BadRequestException('User hat diese Rolle bereits');
    }
    console.log(`  ├─ No existing role found`);

    // Hinzufügen
    console.log(`  ├─ Creating user_role...`);
    const result = await this.prisma.user_roles.create({
      data: {
        user_id: userId,
        role_id: roleId
      },
      include: {
        roles: {
          include: {
            roles_permissions: {
              include: { permissions: true }
            }
          }
        }
      }
    });
    console.log(`  └─ ✅ Role added successfully`);
    return result;
  }

  /**
   * Entfernt eine Rolle von einem User.
   * 
   * Sicherheit:
   * - Es muss mindestens 1 Superuser/Admin existieren
   * - Wenn das der letzte ist, kann die Rolle nicht entfernt werden
   * 
   * @param userId - Die User ID
   * @param roleId - Die Role ID
   */
  async removeRoleFromUser(userId: number, roleId: number) {
    console.log(`➖ removeRoleFromUser: userId=${userId}, roleId=${roleId}`);

    // Finde die Rolle
    const role = await this.prisma.roles.findUnique({
      where: { role_id: roleId }
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} nicht gefunden`);
    }
    console.log(`  ├─ Role: ${role.name}`);

    // Prüfe: User hat diese Rolle?
    const userRole = await this.prisma.user_roles.findUnique({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId
        }
      }
    });

    if (!userRole) {
      throw new NotFoundException('User hat diese Rolle nicht');
    }

    // SICHERHEIT: Wenn es eine kritische Rolle ist (Superuser/Admin), muss mindestens 1 andere existieren
    const criticalRoles = ['Superuser', 'Admin'];
    if (role.name && criticalRoles.includes(role.name)) {
      // Zähle wie viele User diese Rolle NOCH haben (nach diesem einen entfernt)
      const countWithRole = await this.prisma.user_roles.count({
        where: {
          role_id: roleId
        }
      });

      console.log(`  ├─ Critical role "${role.name}" - currently ${countWithRole} user(s) have it`);

      // Wenn nur noch 1 hat und das ist dieser User - blocken!
      if (countWithRole <= 1) {
        console.error(`  └─ ❌ Cannot remove - would leave 0 ${role.name}s`);
        throw new BadRequestException(
          `Kann nicht durchgeführt werden: Es muss mindestens 1 ${role.name} existieren`
        );
      }
    }

    console.log(`  ├─ Checks passed - deleting role`);
    const result = await this.prisma.user_roles.delete({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId
        }
      },
      include: {
        roles: true
      }
    });
    console.log(`  └─ ✅ Role removed successfully`);
    return result;
  }

  private getPermissionStatus(valid_from: Date | null, valid_to: Date | null, today: Date): string {
    if (valid_from && new Date(valid_from) > today) return 'NOT_YET_VALID';
    if (valid_to && new Date(valid_to) < today) return 'EXPIRED';
    return 'VALID';
  }

  private extractUniqueRolePermissions(userRoles: any[]): any[] {
    const permissions = new Map();
    userRoles.forEach(role => {
      role.permissions.forEach(perm => {
        if (!permissions.has(perm.name)) {
          permissions.set(perm.name, perm);
        }
      });
    });
    return Array.from(permissions.values());
  }
}