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
  password_hash: string;
}

export type UserChanges = Partial<Omit<NewUser, "password_hash">>;

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
  abstract findSummary(userId: number): Promise<UserSummary | null>;
  abstract findAllForChat(): Promise<UserForChat[]>;
  abstract findAllWithAccess(): Promise<UserWithAccess[]>;
  abstract update(userId: number, changes: UserChanges): Promise<UserRecord>;
  abstract updatePasswordHash(
    userId: number,
    passwordHash: string,
  ): Promise<UserRecord>;
  abstract delete(userId: number): Promise<UserRecord>;

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
