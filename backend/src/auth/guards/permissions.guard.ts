import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * Enforces @RequirePermission('key') using the permissionKeys embedded in the
 * JWT at login. Admin-class users bypass everything so existing single-user
 * installs keep working with zero configuration.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required) return true;

        const { user } = context.switchToHttp().getRequest();
        if (!user) throw new ForbiddenException('Sem sessão válida.');
        if (user.isAdmin || user.isSuperAdmin || user.isTechnical) return true;

        const keys: string[] = Array.isArray(user.permissionKeys) ? user.permissionKeys : [];
        if (keys.includes(required)) return true;

        throw new ForbiddenException(
            `Sem permissão para esta operação (${required}). Contacte o administrador.`,
        );
    }
}
