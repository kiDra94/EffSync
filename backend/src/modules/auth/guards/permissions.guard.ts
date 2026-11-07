import {
  PERMISSION_FLAG_KEY,
  PERMISSIONS_KEY,
} from "../decorators/permissions.decorator";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsService } from "../../permissions/permissions.service";
import { PermissionFlag } from "../../permissions/permissions.service";

/**
 * PermissionsGuard - permission-based access control (with flags and validity periods)
 *
 * Used together with the @Permissions() decorator.
 *
 * Example:
 * @Post()
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('edit_tasks')
 * async create(@Body() dto: CreateTaskDto) { ... }
 *
 * Only users with the permission 'edit_tasks' can access this method.
 * The permission's validity period is checked as well (valid_from, valid_to).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Read the required permissions from the @Permissions() decorator
    const requiredPermissions = this.reflector.get<string[] | undefined>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    const requiredFlag =
      this.reflector.get<PermissionFlag | undefined>(
        PERMISSION_FLAG_KEY,
        context.getHandler(),
      ) ?? PermissionFlag.READ;

    // No @Permissions on the handler: no permission restriction
    if (requiredPermissions === undefined) {
      return true;
    }
    // @Permissions with an empty list fails closed (T54)
    if (requiredPermissions.length === 0) {
      throw new ForbiddenException("No permission declared for this endpoint");
    }

    // Get the request and the current user
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException("No user ID found in request");
    }

    for (const permissionExpression of requiredPermissions) {
      // Supports aliases via "perm_a|perm_b" (OR within one entry)
      // Several @Permissions entries are still combined with AND.
      const alternatives = permissionExpression
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);

      const hasPermission = await this.permissionsService.hasAnyPermission(
        userId,
        alternatives.length > 0 ? alternatives : [permissionExpression],
        requiredFlag,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Missing permission: ${permissionExpression}`,
        );
      }
    }

    return true;
  }
}
