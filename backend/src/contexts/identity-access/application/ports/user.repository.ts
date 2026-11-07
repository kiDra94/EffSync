import type {
  PermissionRecord,
  RoleRecord,
  UserForChat,
  UserPermissionRecord,
  UserPermissionWithPermission,
  UserRecord,
  UserRoleRecord,
  UserRoleWithRole,
  UserRoleWithRolePermissions,
  UserSummary,
  UserWithAccess,
  UserWithRoles,
} from "./identity-records";

export interface NewUser {
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  /** null for an account that signs in only with Google */
  password_hash: string | null;
  google_id?: string;
}

export type UserChanges = Partial<Omit<NewUser, "password_hash" | "google_id">>;

/** Users, their roles and their direct permissions (port; Prisma in infrastructure). */
export abstract class UserRepository {
  abstract create(data: NewUser): Promise<UserRecord>;
  abstract findById(userId: number): Promise<UserRecord | null>;
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  abstract findByUsername(username: string): Promise<UserRecord | null>;
  abstract findByIdWithRoles(userId: number): Promise<UserWithRoles | null>;
  abstract findByUsernameWithRoles(
    username: string,
  ): Promise<UserWithRoles | null>;
  abstract findByEmailWithRoles(email: string): Promise<UserWithRoles | null>;
  abstract findByGoogleIdWithRoles(
    googleId: string,
  ): Promise<UserWithRoles | null>;
  abstract linkGoogleId(userId: number, googleId: string): Promise<void>;
  abstract findSummary(userId: number): Promise<UserSummary | null>;
  abstract findAllForChat(): Promise<UserForChat[]>;
  abstract findAllWithAccess(): Promise<UserWithAccess[]>;
  abstract update(userId: number, changes: UserChanges): Promise<UserRecord>;
  abstract updatePasswordHash(
    userId: number,
    passwordHash: string,
  ): Promise<UserRecord>;
  /** Classes the user heads, teaches, and lesson slots they hold (M14). */
  abstract countTeacherAssignments(userId: number): Promise<number>;
  /**
   * Locks the user's row (and teacher row) until the unit of work ends and
   * returns the user; null if there is none. Run inside a unit of work.
   */
  abstract lockForDeletion(userId: number): Promise<UserRecord | null>;
  /**
   * Account deletion (T10, decision H1): shared content moves to the ghost
   * user, personal rows are deleted, then the user row. Run inside a unit of
   * work, after lockForDeletion.
   */
  abstract anonymizeAndDelete(userId: number): Promise<UserRecord>;

  abstract findRoleById(roleId: number): Promise<RoleRecord | null>;
  abstract findRoleByName(name: string): Promise<RoleRecord | null>;
  abstract findUserRole(
    userId: number,
    roleId: number,
  ): Promise<UserRoleRecord | null>;
  abstract assignRole(userId: number, roleId: number): Promise<UserRoleRecord>;
  abstract assignRoleWithPermissions(
    userId: number,
    roleId: number,
  ): Promise<UserRoleWithRolePermissions>;
  abstract countUsersWithRole(roleId: number): Promise<number>;
  abstract removeRole(
    userId: number,
    roleId: number,
  ): Promise<UserRoleWithRole>;
  abstract findRolesWithPermissions(
    userId: number,
  ): Promise<UserRoleWithRolePermissions[]>;

  abstract findPermissionById(
    permissionId: number,
  ): Promise<PermissionRecord | null>;
  abstract findUserPermission(
    userId: number,
    permissionId: number,
  ): Promise<UserPermissionRecord | null>;
  abstract grantPermission(
    userId: number,
    permissionId: number,
    validFrom: Date | null,
    validTo: Date | null,
  ): Promise<UserPermissionWithPermission>;
  abstract revokePermission(
    userId: number,
    permissionId: number,
  ): Promise<UserPermissionRecord>;
  abstract findPermissionsOfUser(
    userId: number,
  ): Promise<UserPermissionWithPermission[]>;
}
