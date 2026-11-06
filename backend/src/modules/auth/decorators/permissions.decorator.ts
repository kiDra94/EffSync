import { SetMetadata } from "@nestjs/common";

/**
 * @Permissions() Decorator
 *
 * Wird verwendet in Kombination mit PermissionsGuard.
 * Definiert die erforderlichen Permissions für einen Endpoint.
 *
 * Beispiele:
 * @Permissions('create_tasks')
 * @Permissions('edit_tasks', 'delete_tasks')
 * @Permissions()  // Leerer Array = kein PermissionsGuard-Schutz
 *
 * Verwendung im Controller:
 * @Post()
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('create_tasks', 'edit_tasks')
 * async create(@Body() dto: CreateTaskDto) {
 *   // Nur User mit ALLEN Permissions (create_tasks UND edit_tasks) können diesen Endpoint aufrufen
 *   // Zeitlimits werden automatisch validiert!
 * }
 *
 * WICHTIG:
 * - Auch abgelaufene Permissions (valid_to < NOW) werden als ungültig behandelt
 * - Noch nicht gültige Permissions (valid_from > NOW) werden als ungültig behandelt
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata("permissions", permissions);
