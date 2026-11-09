/**
 * Row shapes the identity-access ports return. They are Prisma's generated
 * types, imported type-only: application code uses them as plain data and
 * never calls Prisma (that is infrastructure's job).
 */
import type { Prisma, users } from "@prisma/client";

export type UserRecord = users;

export type UserWithRoles = Prisma.usersGetPayload<{
  include: { user_roles: { include: { roles: true } } };
}>;

export type UserSummary = Prisma.usersGetPayload<{
  select: {
    user_id: true;
    firstname: true;
    lastname: true;
    username: true;
    email: true;
  };
}>;

export type UserForChat = Prisma.usersGetPayload<{
  select: { user_id: true; firstname: true; lastname: true; username: true };
}>;

export type UserWithAccess = Prisma.usersGetPayload<{
  select: {
    user_id: true;
    firstname: true;
    lastname: true;
    username: true;
    email: true;
    user_roles: { include: { roles: true } };
    user_permissions: { include: { permissions: true } };
  };
}>;

export type UserPermissionWithPermission = Prisma.user_permissionsGetPayload<{
  include: { permissions: true };
}>;

export type UserRoleWithRole = Prisma.user_rolesGetPayload<{
  include: { roles: true };
}>;

export type UserRoleWithRolePermissions = Prisma.user_rolesGetPayload<{
  include: {
    roles: {
      include: { roles_permissions: { include: { permissions: true } } };
    };
  };
}>;

export type RoleWithPermissions = Prisma.rolesGetPayload<{
  include: { roles_permissions: { include: { permissions: true } } };
}>;

export type PermissionWithAssignments = Prisma.permissionsGetPayload<{
  include: {
    roles_permissions: { include: { roles: true } };
    user_permissions: true;
  };
}>;

export type RoleRecord = Prisma.rolesGetPayload<object>;
export type PermissionRecord = Prisma.permissionsGetPayload<object>;
export type UserPermissionRecord = Prisma.user_permissionsGetPayload<object>;
export type UserRoleRecord = Prisma.user_rolesGetPayload<object>;

/** A grant of a permission name to a user, directly or through a role (M37). */
export interface PermissionGrant {
  name: string;
  via: "user" | "role";
  flags: number;
  /** Only direct grants have a validity period. */
  valid_from: Date | null;
  valid_to: Date | null;
}
