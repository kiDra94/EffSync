import { SetMetadata } from "@nestjs/common";

/**
 * @Roles() Decorator
 *
 * Used together with RolesGuard.
 * Defines the roles an endpoint requires.
 *
 * Examples:
 * @Roles('Teacher')
 * @Roles('Admin', 'Manager')
 * @Roles()  // empty array = no RolesGuard protection
 *
 * Usage in a controller:
 * @Get()
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('Teacher', 'Admin')
 * async findAll() {
 *   // Only users with the role Teacher OR Admin can call this endpoint
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);
