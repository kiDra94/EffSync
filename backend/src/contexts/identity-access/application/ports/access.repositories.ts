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

/**
 * One permission of a role in the system configuration (M35); without
 * `flags` the permission keeps its own (decision I2: they are the
 * permission's, for every role).
 */
export interface RolePermissionEntry {
  permission_id: number;
  flags?: number;
}

/** Roles with their permissions (RolesService). */
export abstract class RoleRepository {
  abstract findAll(): Promise<RoleWithPermissions[]>;
  abstract findOne(roleId: number): Promise<RoleWithPermissions | null>;
  abstract findPermissionsByIds(
    permissionIds: number[],
  ): Promise<{ permission_id: number; name: string; flags: number }[]>;
  /**
   * The role's permissions become exactly these, and each entry with flags
   * gives its permission those flags (decision I2), in one transaction (M35).
   */
  abstract replacePermissions(
    roleId: number,
    entries: RolePermissionEntry[],
  ): Promise<void>;
}
