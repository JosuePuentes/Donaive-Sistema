import type { PermissionCode } from '@flp/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  branchId: string | null;
  branch: { id: string; code: string; name: string } | null;
  roles: string[];
  permissions: PermissionCode[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}
