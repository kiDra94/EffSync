import { Injectable, NotFoundException } from "@nestjs/common";
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
    return await this.prisma.users.findMany({
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
      }
    });
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
  }}