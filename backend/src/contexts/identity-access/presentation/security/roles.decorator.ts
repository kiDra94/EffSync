import { RoleName } from "../../domain/role-permissions";
import { SetMetadata } from "@nestjs/common";

/**
 * @Roles() Decorator
 *
 * Used together with RolesGuard.
 * Defines the roles an endpoint requires.
 *
 * Examples:
 * @Roles(RoleName.TEACHER)
 * @Roles(RoleName.ADMIN, RoleName.SUPERUSER)
 * @Roles()  // empty array = no RolesGuard protection
 *
 * Usage in a controller:
 * @Get()
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(RoleName.TEACHER, RoleName.ADMIN)
 * async findAll() {
 *   // Only users with the role Teacher OR Admin can call this endpoint
 * }
 */
export const ROLES_KEY = "roles";

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
