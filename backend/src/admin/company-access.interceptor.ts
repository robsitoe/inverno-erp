import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Um utilizador com empresa atribuída só trabalha nessa empresa. Administradores, super administradores
 * e técnicos gerem todas; utilizadores sem empresa atribuída mantêm o acesso a todas (instalações antigas).
 */
@Injectable()
export class CompanyAccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.isAdmin || user.isSuperAdmin || user.isTechnical || !user.companyId) return next.handle();

    const requested = String(req.headers?.['x-company-id'] || req.query?.companyId || req.body?.companyId || '').trim();
    if (requested && requested !== String(user.companyId)) {
      throw new ForbiddenException('Não tem acesso a esta empresa. Peça ao administrador para lhe dar acesso.');
    }
    return next.handle();
  }
}
