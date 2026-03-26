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

    // Prüfe: Hat User ALLE erforderlichen Permissions?
    // (AND-Logik: alle müssen vorhanden sein)
    for (const permissionName of requiredPermissions) {
      const hasPermission = await this.permissionsService.hasPermission(
        userId,
        permissionName,
        PermissionFlag.READ, // Minimale Flag für die Prüfung
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Missing permission: ${permissionName}`,
        );
      }
    }

    return true; // Alle erforderlichen Permissions vorhanden → Zugriff erlaubt
  }
}
