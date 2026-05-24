import type { PermissionCode } from '@flp/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: PermissionCode[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}
