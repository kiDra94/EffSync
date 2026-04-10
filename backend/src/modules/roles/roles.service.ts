import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Hole alle verfügbaren Rollen
   */
  async findAll() {
    return this.prisma.roles.findMany({
      include: {
        roles_permissions: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }

  /**
   * Hole eine Rolle mit ihren Permissions
   */
  async findOne(roleId: number) {
    return this.prisma.roles.findUnique({
      where: { role_id: roleId },
      include: {
        roles_permissions: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }
}
