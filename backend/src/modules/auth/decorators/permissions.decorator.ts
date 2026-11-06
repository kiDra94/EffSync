import { SetMetadata } from "@nestjs/common";

/**
 * @Permissions() Decorator
 *
 * Used together with PermissionsGuard.
 * Defines the permissions an endpoint requires.
 *
 * Examples:
 * @Permissions('create_tasks')
 * @Permissions('edit_tasks', 'delete_tasks')
 * @Permissions()  // empty array = no PermissionsGuard protection
 *
 * Usage in a controller:
 * @Post()
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('create_tasks', 'edit_tasks')
 * async create(@Body() dto: CreateTaskDto) {
 *   // Only users with ALL permissions (create_tasks AND edit_tasks) can call this endpoint
 *   // Validity periods are checked automatically!
 * }
 *
 * IMPORTANT:
 * - Expired permissions (valid_to < NOW) are treated as invalid
 * - Permissions that are not yet valid (valid_from > NOW) are treated as invalid
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata("permissions", permissions);
