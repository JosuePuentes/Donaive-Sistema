import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@flp/shared';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_ALL_KEY = 'permissions_all';
export const ROLES_KEY = 'roles';

/** Requiere al menos uno de los permisos listados */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Requiere todos los permisos listados */
export const RequireAllPermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_ALL_KEY, permissions);

/** Requiere uno o más roles del sistema */
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

/** Alias semántico: endpoint exclusivo del POS */
export const PosOnly = () =>
  RequirePermissions('POS_ACCESS');

/** Alias semántico: operaciones de caja */
export const CashRegisterAccess = () =>
  RequirePermissions('CASH_REGISTER_OPEN', 'CASH_REGISTER_CLOSE');
