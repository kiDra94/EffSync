/**
 * Standard-Permissions für Rollen
 * Diese Konfiguration definiert, welche Permissions automatisch
 * mit einer Rolle zugewiesen werden
 */

/**
 * @public used by RolesGuard and @Roles() in GOALS.md M7
 */
export enum RoleName {
  SUPERUSER = "Superuser",
  ADMIN = "Admin",
  TEACHER = "Teacher",
  STUDENT = "Student",
}

/**
 * Definierte Permissions pro Rolle
 * Format: {
 *   [RoleName]: ['permission_name_1', 'permission_name_2', ...]
 * }
 */
export const ROLE_PERMISSIONS_CONFIG: Record<RoleName, string[]> = {
  // ============ SUPERUSER ============
  // Hat ALLE Permissions
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
  // Administrative Funktionen
  [RoleName.ADMIN]: [
    "view_dashboard",
    "manage_users",
    "manage_classes",
    "manage_system",
    "view_grades",
    "view_schedules",
  ],

  // ============ TEACHER ============
  // Lehrerkünfte
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
  // Schülerfunktionen
  [RoleName.STUDENT]: ["view_dashboard", "view_grades", "view_schedules"],
};

/**
 * Helper-Funktion um Permissions zu einer Rolle zu bekommen
 * @param roleName - Der Name der Rolle
 * @returns Array von Permission-Namen
 */
export function getPermissionsForRole(roleName: string): string[] {
  const role = Object.values(RoleName).find((r) => r === roleName);
  if (!role) {
    console.warn(`Rolle "${roleName}" nicht in Konfiguration gefunden`);
    return [];
  }
  return ROLE_PERMISSIONS_CONFIG[role as RoleName] || [];
}
