import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsService } from "../../permissions/permissions.service";

/**
 * RolesGuard - role-based access control
 *
 * Used together with the @Roles() decorator.
 *
 * Example:
 * @Get()
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('Teacher', 'Admin')
 * async findAll() { ... }
 *
 * Only users with the role "Teacher" OR "Admin" can access this method.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Read the required roles from the @Roles() decorator
    const requiredRoles = this.reflector.get<string[]>(
      "roles",
      context.getHandler(),
    );

    // No roles defined: allow (no protection)
    if (!requiredRoles) {
      return true;
    }

    // Get the request and the current user
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException("No user ID found in request");
    }

    // Check: does the user have AT LEAST ONE of the required roles?
    for (const role of requiredRoles) {
      const hasRole = await this.permissionsService.hasRole(userId, role);
      if (hasRole) {
        return true; // Has one of the required roles → access granted
      }
    }

    // The user has none of the required roles
    throw new ForbiddenException(
      `Insufficient role. Required: ${requiredRoles.join(" OR ")}`,
    );
  }
}
