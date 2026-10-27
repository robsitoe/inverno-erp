import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { SystemEventsService } from './system-events.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const USER_PATH = /^\/(users|profiles)(\/|$)/;
const CONFIG_PATH = /^\/(companies|fiscal-years|series|document-types|payment-gateways|payment-methods|licenses|taxes|admin\/maintenance\/plans|accounting\/accounts\/presets|accounting\/period-close|accounting\/accounts\/recalculate|accounting\/accounts\/import-csv)(\/|$)/;

/** Regista no log de eventos as acções administrativas relevantes (sem corpos de pedidos, para não guardar segredos). */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly events: SystemEventsService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const path: string = (req.originalUrl || req.url || '').split('?')[0];
    const companyId: string | undefined = (req.headers?.['x-company-id'] as string) || req.query?.companyId || undefined;

    const isLogin = method === 'POST' && path === '/auth/login';
    const isBackup = method === 'GET' && path === '/admin/system/backup';
    const isRestore = method === 'POST' && path === '/admin/system/restore';
    const classify = (): 'ACESSO' | 'UTILIZADOR' | 'CONFIGURAÇÃO' | 'SISTEMA' | null => {
      if (isLogin) return 'ACESSO';
      if (isBackup || isRestore) return 'SISTEMA';
      if (!MUTATING.has(method)) return null;
      if (USER_PATH.test(path)) return 'UTILIZADOR';
      if (CONFIG_PATH.test(path)) return 'CONFIGURAÇÃO';
      return null;
    };
    const category = classify();
    if (!category) return next.handle();

    const who = () => req.user?.username || (isLogin ? String(req.body?.username || '-') : '-');
    const label = () => isLogin ? 'Início de sessão' : isBackup ? 'Cópia de segurança descarregada'
      : isRestore ? (req.query?.dryRun === 'true' ? 'Validação de restauro' : 'Restauro de cópia de segurança') : `${method} ${path}`;

    return next.handle().pipe(tap({
      next: () => { void this.events.log({ category, action: label(), detail: isLogin ? '' : `${method} ${path}`, user: who(), companyId }); },
      error: (err: any) => {
        if (isLogin) void this.events.log({ category, action: 'Falha no início de sessão', detail: `HTTP ${err?.status || '?'}`, user: who(), companyId });
      },
    }));
  }
}
