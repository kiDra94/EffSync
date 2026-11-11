import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PermissionsService } from "../../identity-access/application";

const roleFilter = (roleNames: readonly string[]) => ({
  OR: roleNames.map((name) => ({
    name: { equals: name, mode: "insensitive" as const },
  })),
});

/**
 * The real PermissionsService for the TaskMembersService specs, over their
 * Prisma mock: only identity-access's role queries are given here (M38:
 * Admin and Superuser hold every flag on a task).
 */
export const permissionsOverPrisma = {
  provide: PermissionsService,
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) =>
    new PermissionsService({
      countUserRolesNamed: (userId: number, roleNames: readonly string[]) =>
        prisma.user_roles.count({
          where: { user_id: userId, roles: roleFilter(roleNames) },
        }),
      findUserIdsWithRoles: async (
        userIds: number[],
        roleNames: readonly string[],
      ) =>
        (
          await prisma.user_roles.findMany({
            where: { user_id: { in: userIds }, roles: roleFilter(roleNames) },
            select: { user_id: true },
          })
        ).map((row) => row.user_id),
    } as never),
};
