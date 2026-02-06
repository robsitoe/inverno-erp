import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles: string[] = [
      ...(Reflect.getMetadata(ROLES_KEY, context.getClass()) || []),
      ...(Reflect.getMetadata(ROLES_KEY, context.getHandler()) || []),
    ];

    if (!requiredRoles.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    if (user.isSuperAdmin || user.isAdmin) {
      return true;
    }

    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
          .map((permission: any) => {
            if (typeof permission === 'string') return permission;
            if (
              permission?.permission &&
              typeof permission.permission === 'string'
            )
              return permission.permission;
            if (permission?.name && typeof permission.name === 'string')
              return permission.name;
            return null;
          })
          .filter((permission): permission is string => Boolean(permission))
      : [];

    const hasPermission = requiredRoles.some((requiredRole) => {
      if (userPermissions.includes(requiredRole)) {
        return true;
      }

      const [module] = requiredRole.split(':');
      return (
        userPermissions.includes(`${module}:*`) || userPermissions.includes('*')
      );
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
