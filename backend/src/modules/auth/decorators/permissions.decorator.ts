import { applyDecorators, SetMetadata } from "@nestjs/common";
import { PermissionFlag } from "../../permissions/permissions.service";

/**
 * @Permissions() Decorator
 *
 * Used together with PermissionsGuard.
 * Defines the permissions an endpoint requires.
 *
 * Examples:
 * @Permissions('create_tasks')
 * @Permissions('edit_tasks', 'delete_tasks')
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
export const PERMISSIONS_KEY = "permissions";
export const PERMISSION_FLAG_KEY = "permission_flag";

/**
 * At least one permission name (T54: no endpoint without a permission), and
 * optionally the flag it needs (T94), e.g.
 * `@Permissions("edit_tasks", PermissionFlag.WRITE)`. Without a flag: READ.
 */
export const Permissions = (
  permission: string,
  ...rest: Array<string | PermissionFlag>
) => {
  const names = [permission, ...rest.filter((e) => typeof e === "string")];
  const flag =
    rest.find((e): e is PermissionFlag => typeof e === "number") ??
    PermissionFlag.READ;
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, names),
    SetMetadata(PERMISSION_FLAG_KEY, flag),
  );
};
