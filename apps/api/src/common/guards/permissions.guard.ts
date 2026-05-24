import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAnyPermission, hasAllPermissions, type PermissionCode } from '@flp/shared';
import { PERMISSIONS_KEY, PERMISSIONS_ALL_KEY } from '../decorators/permissions.decorator';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Guard RBAC — Control de acceso basado en permisos granulares.
 *
 * Uso:
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *   @RequirePermissions('PURCHASES_VIEW', 'PURCHASES_CREATE')
 *   @Get('purchases')
 *   findAll() { ... }
 *
 * Si el usuario es ADMIN, se concede acceso total automáticamente.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAllPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_ALL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredAllPermissions || requiredAllPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.roles.includes('ADMIN')) {
      return true;
    }

    const hasAny = requiredPermissions?.length
      ? hasAnyPermission(user.permissions, requiredPermissions)
      : true;
    const hasAll = requiredAllPermissions?.length
      ? hasAllPermissions(user.permissions, requiredAllPermissions)
      : true;

    if (!hasAny || !hasAll) {
      const parts = [
        ...(requiredPermissions ?? []),
        ...(requiredAllPermissions ?? []),
      ];
      throw new ForbiddenException(
        `Acceso denegado. Permisos requeridos: ${parts.join(', ')}`,
      );
    }

    return true;
  }
}
