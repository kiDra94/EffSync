import type {
  PermissionGrant,
  PermissionWithAssignments,
  RoleWithPermissions,
  UserPermissionRecord,
  UserPermissionWithPermission,
  UserRoleRecord,
  UserRoleWithRole,
} from "./identity-records";

/** Reads for permission checks (PermissionsService). */
export abstract class PermissionRepository {
  abstract countUserRolesNamed(
    userId: number,
    roleNames: readonly string[],
  ): Promise<number>;
  abstract findUserRoles(userId: number): Promise<UserRoleWithRole[]>;
  /**
   * Per asked name: the user's direct grant (with its validity period) and
   * the grant through the user's first role that has it, in one query (M37:
   * it took six on every request). "First" is the lowest role id, then
   * permission id.
   */
  abstract findGrants(
    userId: number,
    permissionNames: string[],
  ): Promise<PermissionGrant[]>;
  abstract findPermissionsOfUser(
    userId: number,
  ): Promise<UserPermissionWithPermission[]>;
  abstract findAllPermissions(): Promise<PermissionWithAssignments[]>;
  abstract findPermission(
    permissionId: number,
  ): Promise<PermissionWithAssignments | null>;
}

/** Roles with their permissions (RolesService). */
export abstract class RoleRepository {
  abstract findAll(): Promise<RoleWithPermissions[]>;
  abstract findOne(roleId: number): Promise<RoleWithPermissions | null>;
}

/** Role-derived user permissions (RolePermissionsService). */
export abstract class RolePermissionRepository {
  abstract findPermissionIdsOfRole(roleId: number): Promise<number[]>;
  abstract findPermissionIdByName(name: string): Promise<number | null>;
  abstract findUserPermission(
    userId: number,
    permissionId: number,
  ): Promise<UserPermissionRecord | null>;
  abstract grantPermissionFromNow(
    userId: number,
    permissionId: number,
  ): Promise<UserPermissionRecord>;
  abstract findOtherRoleGranting(
    userId: number,
    permissionId: number,
  ): Promise<UserRoleRecord | null>;
  abstract revokePermission(
    userId: number,
    permissionId: number,
  ): Promise<UserPermissionRecord>;
}
