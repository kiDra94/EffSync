import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PermissionsService } from "../../identity-access/application";

/**
 * The real PermissionsService for the TaskMembersService specs, over their
 * Prisma mock: only identity-access's direct-grant query is given here, the
 * validity window is the service's own (review of the Definition-of-done
 * refactor).
 */
export const permissionsOverPrisma = {
  provide: PermissionsService,
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) =>
    new PermissionsService({
      findPermissionsOfUser: (userId: number) =>
        prisma.user_permissions.findMany({
          where: { user_id: userId },
          include: { permissions: true },
        }),
    } as never),
};
