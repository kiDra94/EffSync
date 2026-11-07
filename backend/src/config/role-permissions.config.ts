/**
 * Default permissions per role
 * This configuration defines which permissions are assigned
 * automatically with a role
 */

/**
 * The role names, as stored in the `roles` table.
 */
export enum RoleName {
  SUPERUSER = "Superuser",
  ADMIN = "Admin",
  TEACHER = "Teacher",
  STUDENT = "Student",
}

/** Roles that see all tasks and documents and grade submissions. */
export const STAFF_ROLES: readonly RoleName[] = [
  RoleName.TEACHER,
  RoleName.ADMIN,
  RoleName.SUPERUSER,
];

/** Roles that may edit and delete everything. */
export const PRIVILEGED_ROLES: readonly RoleName[] = [
  RoleName.ADMIN,
  RoleName.SUPERUSER,
];

/**
 * Compares a role name case-insensitively with a list of roles. The JWT
 * carries the user's first role in lower case (auth.service.ts login).
 */
export function isRoleIn(
  role: string | null | undefined,
  roles: readonly RoleName[],
): boolean {
  const name = (role ?? "").trim().toLowerCase();
  return roles.some((candidate) => candidate.toLowerCase() === name);
}

/**
 * Permissions defined per role
 * Format: {
 *   [RoleName]: ['permission_name_1', 'permission_name_2', ...]
 * }
 */
export const ROLE_PERMISSIONS_CONFIG: Record<RoleName, string[]> = {
  // ============ SUPERUSER ============
  // Has ALL permissions
  [RoleName.SUPERUSER]: [
    "view_dashboard",
    "manage_users",
    "manage_classes",
    "create_tasks",
    "edit_tasks",
    "delete_tasks",
    "view_grades",
    "edit_grades",
    "view_schedules",
    "manage_system",
  ],

  // ============ ADMIN ============
  // Administrative functions
  [RoleName.ADMIN]: [
    "view_dashboard",
    "manage_users",
    "manage_classes",
    "manage_system",
    "view_grades",
    "view_schedules",
    // UC-10 names Admin as an actor of "create task" (decision F2)
    "create_tasks",
    "edit_tasks",
    // Admin is staff (STAFF_ROLES) and kept grading (M8 review)
    "edit_grades",
  ],

  // ============ TEACHER ============
  // Teacher functions
  [RoleName.TEACHER]: [
    "view_dashboard",
    "create_tasks",
    "edit_tasks",
    "delete_tasks",
    "view_grades",
    "edit_grades",
    "view_schedules",
  ],

  // ============ STUDENT ============
  // Student functions
  // UC-10…12: students create, edit and finish their own tasks (decision F2)
  [RoleName.STUDENT]: [
    "view_dashboard",
    "view_grades",
    "view_schedules",
    "create_tasks",
    "edit_tasks",
  ],
};

/**
 * Helper that returns the permissions of a role
 * @param roleName - the name of the role
 * @returns array of permission names
 */
export function getPermissionsForRole(roleName: string): string[] {
  const role = Object.values(RoleName).find((r) => r === roleName);
  if (!role) {
    console.warn(`Rolle "${roleName}" nicht in Konfiguration gefunden`);
    return [];
  }
  return ROLE_PERMISSIONS_CONFIG[role as RoleName] || [];
}
