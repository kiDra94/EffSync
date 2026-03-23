import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCheckerService, PermissionFlag } from './permission-checker.service';

export const PERMISSION_KEY = 'permission';
export const REQUIRED_FLAG_KEY = 'requiredFlag';

export function RequirePermission(
  permissionName: string,
  requiredFlag: PermissionFlag = PermissionFlag.READ
) {
  return (
    target: any,
    propertyKey?: string | symbol | undefined,
    descriptor?: PropertyDescriptor | undefined
  ) => {
    if (propertyKey && descriptor) {
      SetMetadata(PERMISSION_KEY, permissionName)(target, propertyKey, descriptor);
      SetMetadata(REQUIRED_FLAG_KEY, requiredFlag)(target, propertyKey, descriptor);
    }
  };
}


export function RequireRole(roleName: string) {
  return SetMetadata('role', roleName);
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionChecker: PermissionCheckerService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User nicht authentifiziert');
    }

    // Prüfe Permission (falls Decorator vorhanden)
    const requiredPermission = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler()
    );

    if (requiredPermission) {
      const requiredFlag = this.reflector.get<PermissionFlag>(
        REQUIRED_FLAG_KEY,
        context.getHandler()
      ) || PermissionFlag.READ;

      const hasPermission = await this.permissionChecker.hasPermission(
        userId,
        requiredPermission,
        requiredFlag
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Permission "${requiredPermission}" nicht vorhanden oder abgelaufen`
        );
      }
    }

    // Prüfe Rolle (falls Decorator vorhanden)
    const requiredRole = this.reflector.get<string>('role', context.getHandler());

    if (requiredRole) {
      const hasRole = await this.permissionChecker.hasRole(userId, requiredRole);

      if (!hasRole) {
        throw new ForbiddenException(
          `Rolle "${requiredRole}" nicht vorhanden`
        );
      }
    }

    return true;
  }
}
