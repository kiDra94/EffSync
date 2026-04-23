import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../permissions/permissions.service';
import { PermissionFlag } from '../../permissions/permissions.service';

/**
 * PermissionsGuard - Permission-basierte Zugriffskontrolle (mit Flags & Zeitvalidierung)
 * 
 * Wird in Kombination mit dem @Permissions() Decorator verwendet.
 * 
 * Beispiel:
 * @Post()
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('edit_tasks')
 * async create(@Body() dto: CreateTaskDto) { ... }
 * 
 * Diese Methode ist nur für User mit der Permission 'edit_tasks' zugreifbar.
 * Die Permission wird auch auf zeitliche Gültigkeit geprüft (valid_from, valid_to).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Hole die erforderlichen Permissions aus dem @Permissions() Decorator
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    // Wenn keine Permissions definiert sind, erlauben (kein Schutz)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Hole den Request und den aktuellen User
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('No user ID found in request');
    }

    for (const permissionExpression of requiredPermissions) {
      // Unterstützt Aliase via "perm_a|perm_b" (OR innerhalb eines Eintrags)
      // Mehrere @Permissions-Einträge bleiben weiterhin AND-verknüpft.
      const alternatives = permissionExpression
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean);

      const hasPermission = await this.permissionsService.hasAnyPermission(
        userId,
        alternatives.length > 0 ? alternatives : [permissionExpression],
        PermissionFlag.READ,
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
