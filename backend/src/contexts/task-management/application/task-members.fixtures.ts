import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PermissionsService } from "../../identity-access/application";

/**
 * PermissionsService for the TaskMembersService specs: its direct-grant
 * query on the specs' Prisma mock, so their `user_permissions.findMany`
 * scenarios hold (Definition of done: the query is identity-access's).
 */
export const permissionsOverPrisma = {
  provide: PermissionsService,
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) => ({
    getActivePermissions: async (userId: number) =>
      (
        await prisma.user_permissions.findMany({
          where: { user_id: userId },
          include: { permissions: true },
        })
      ).map((up) => ({
        name: up.permissions.name,
        flags: up.permissions.flags,
        valid_from: up.valid_from,
        valid_to: up.valid_to,
        isExpired: up.valid_to !== null && new Date() > up.valid_to,
      })),
  }),
};
