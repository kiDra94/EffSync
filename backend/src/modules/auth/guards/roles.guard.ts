import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../permissions/permissions.service';

/**
 * RolesGuard - Rolle-basierte Zugriffskontrolle
 * 
 * Wird in Kombination mit dem @Roles() Decorator verwendet.
 * 
 * Beispiel:
 * @Get()
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('Teacher', 'Admin')
 * async findAll() { ... }
 * 
 * Diese Methode ist nur für User mit Rolle "Teacher" ODER "Admin" zugreifbar.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Hole die erforderlichen Rollen aus dem @Roles() Decorator
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // Wenn keine Rollen definiert sind, erlauben (kein Schutz)
    if (!requiredRoles) {
      return true;
    }

    // Hole den Request und den aktuellen User
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('No user ID found in request');
    }

    // Prüfe: Hat User MINDESTENS EINE der erforderlichen Rollen?
    for (const role of requiredRoles) {
      const hasRole = await this.permissionsService.hasRole(userId, role);
      if (hasRole) {
        return true; // Hat eine der erforderlichen Rollen → Zugriff erlaubt
      }
    }

    // User hat keine der erforderlichen Rollen
    throw new ForbiddenException(
      `Insufficient role. Required: ${requiredRoles.join(' OR ')}`,
    );
  }
}
