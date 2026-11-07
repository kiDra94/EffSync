import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsService } from "../../application/permissions.service";
import { ROLES_KEY } from "./roles.decorator";
import { RoleName } from "../../domain/role-permissions";

/**
 * RolesGuard - role-based access control (T92)
 *
 * Used together with the @Roles() decorator, between JwtAuthGuard and
 * PermissionsGuard, so the check order is token → role → permission (T97).
 *
 * Example:
 * @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
 * @Roles(RoleName.TEACHER, RoleName.ADMIN)
 * async findAll() { ... }
 *
 * Only users with the role Teacher OR Admin can access this method.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<RoleName[] | undefined>(
      ROLES_KEY,
      context.getHandler(),
    );

    // No @Roles() on the handler: no role restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { userId?: number } }>();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException("No user ID found in request");
    }

    // at least one of the required roles, checked in one query
    if (await this.permissionsService.hasAnyRole(userId, requiredRoles)) {
      return true;
    }

    throw new ForbiddenException(
      `Insufficient role. Required: ${requiredRoles.join(" OR ")}`,
    );
  }
}
