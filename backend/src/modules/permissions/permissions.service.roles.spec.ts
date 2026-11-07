/**
 * Role checks (GOALS.md M7, T92): one query for "does the user have at least
 * one of these roles", based on the RoleName enum.
 */
import { PermissionsService } from "./permissions.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RoleName, STAFF_ROLES } from "../../config/role-permissions.config";

describe("PermissionsService.hasAnyRole", () => {
  const prisma = { user_roles: { count: jest.fn() } };
  const service = new PermissionsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("asks with one query whether the user has at least one of the roles", async () => {
    prisma.user_roles.count.mockResolvedValue(1);

    await expect(service.hasAnyRole(7, STAFF_ROLES)).resolves.toBe(true);
    expect(prisma.user_roles.count).toHaveBeenCalledTimes(1);
    expect(prisma.user_roles.count).toHaveBeenCalledWith({
      where: {
        user_id: 7,
        // case-insensitive, like isRoleIn for the JWT role
        roles: {
          OR: [RoleName.TEACHER, RoleName.ADMIN, RoleName.SUPERUSER].map(
            (name) => ({ name: { equals: name, mode: "insensitive" } }),
          ),
        },
      },
    });
  });

  it("is false when the user has none of them", async () => {
    prisma.user_roles.count.mockResolvedValue(0);

    await expect(service.hasAnyRole(7, [RoleName.ADMIN])).resolves.toBe(false);
  });
});
