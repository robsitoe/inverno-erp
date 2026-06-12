import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'required_permission';

/**
 * Marks a route as requiring a permission key from the catalog
 * (common/permissions.catalog.ts). Enforced by PermissionsGuard.
 * Admins (isAdmin/isSuperAdmin/isTechnical) bypass the check.
 */
export const RequirePermission = (permission: string) =>
    SetMetadata(REQUIRED_PERMISSION_KEY, permission);
