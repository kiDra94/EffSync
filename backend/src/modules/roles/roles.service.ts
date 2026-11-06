import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns all available roles
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
   * Returns one role with its permissions
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
