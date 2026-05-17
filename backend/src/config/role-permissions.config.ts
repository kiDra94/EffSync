/**
 * Standard-Permissions für Rollen
 * Diese Konfiguration definiert, welche Permissions automatisch
 * mit einer Rolle zugewiesen werden
 */

export enum RoleName {
  SUPERUSER = 'Superuser',
  ADMIN = 'Admin',
  TEACHER = 'Teacher',
  STUDENT = 'Student',
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
    'view_dashboard',
    'manage_users',
    'manage_classes',
    'create_tasks',
    'edit_tasks',
    'delete_tasks',
    'view_grades',
    'edit_grades',
    'view_schedules',
    'manage_system',
  ],

  // ============ ADMIN ============
  // Administrative Funktionen
  [RoleName.ADMIN]: [
    'view_dashboard',
    'manage_users',
    'manage_classes',
    'manage_system',
    'view_grades',
    'view_schedules',
  ],

  // ============ TEACHER ============
  // Lehrerkünfte
  [RoleName.TEACHER]: [
    'view_dashboard',
    'create_tasks',
    'edit_tasks',
    'delete_tasks',
    'view_grades',
    'edit_grades',
    'view_schedules',
  ],

  // ============ STUDENT ============
  // Schülerfunktionen
  [RoleName.STUDENT]: [
    'view_dashboard',
    'view_grades',
    'view_schedules',
  ],
};

/**
 * Beschreibungen für Permissions (für bessere Lesbarkeit)
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  view_dashboard: 'Kann das Dashboard anschauen',
  manage_users: 'Kann Benutzer verwalten (erstellen, bearbeiten, löschen)',
  manage_classes: 'Kann Klassen verwalten',
  create_tasks: 'Kann neue Aufgaben erstellen',
  edit_tasks: 'Kann Aufgaben bearbeiten',
  delete_tasks: 'Kann Aufgaben löschen',
  view_grades: 'Kann Noten anschauen',
  edit_grades: 'Kann Noten bearbeiten',
  view_schedules: 'Kann Stundenplan anschauen',
  manage_system: 'Kann Systemeinstellungen verwalten',
};

/**
 * Helper-Funktion um Permissions zu einer Rolle zu bekommen
 * @param roleName - Der Name der Rolle
 * @returns Array von Permission-Namen
 */
export function getPermissionsForRole(roleName: string): string[] {
  const role = Object.values(RoleName).find(r => r === roleName);
  if (!role) {
    console.warn(`Rolle "${roleName}" nicht in Konfiguration gefunden`);
    return [];
  }
  return ROLE_PERMISSIONS_CONFIG[role as RoleName] || [];
}
