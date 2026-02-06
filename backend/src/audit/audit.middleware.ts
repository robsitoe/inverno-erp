import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { DataSource, EntityTarget } from 'typeorm';
import { AuditService } from './audit.service';
import { Account } from '../accounting/entities/account.entity';
import { JournalEntry } from '../accounting/entities/journal-entry.entity';
import { Article } from '../inventory/entities/article.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { PurchaseDocument } from '../purchases/entities/purchase.entity';
import { TreasuryDocument } from '../treasury/entities/treasury.entity';
import { PaymentMethod } from '../treasury/entities/payment-method.entity';
import { User } from '../users/entities/user.entity';

interface RouteConfig {
  module: string;
  entity: string;
  target: EntityTarget<any>;
}

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly writableMethods = new Set(['POST', 'PATCH', 'DELETE']);

  private readonly scopedRoutePrefixes = [
    '/accounting',
    '/treasury',
    '/purchases',
    '/sales',
    '/inventory',
    '/payment-methods',
    '/users',
  ];

  private readonly routesMap: Record<string, RouteConfig> = {
    'accounting/accounts': { module: 'financial', entity: 'account', target: Account },
    'accounting/journal-entries': { module: 'financial', entity: 'journal-entry', target: JournalEntry },
    'inventory/articles': { module: 'master-data', entity: 'article', target: Article },
    'inventory/stock-movements': { module: 'financial', entity: 'stock-movement', target: StockMovement },
    'sales/documents': { module: 'financial', entity: 'sales-document', target: SalesDocument },
    'purchases/documents': { module: 'financial', entity: 'purchase-document', target: PurchaseDocument },
    'treasury/documents': { module: 'financial', entity: 'treasury-document', target: TreasuryDocument },
    'payment-methods': { module: 'master-data', entity: 'payment-method', target: PaymentMethod },
    users: { module: 'master-data', entity: 'user', target: User },
  };

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (!this.writableMethods.has(req.method)) {
      return next();
    }

    const path = this.cleanPath(req.path || req.url || '');

    if (!this.scopedRoutePrefixes.some(prefix => path.startsWith(prefix))) {
      return next();
    }

    const routeKey = this.extractRouteKey(path);
    const routeConfig = this.routesMap[routeKey];

    if (!routeConfig) {
      return next();
    }

    const entityId = (req.params?.id || req.body?.id || '').toString() || undefined;
    const userInfo = this.extractUser(req);
    const companyId = this.extractCompanyId(req);
    const beforeState = entityId ? await this.safeFindEntity(routeConfig.target, entityId) : null;

    const originalJson = res.json.bind(res);
    let responseBody: any;
    res.json = ((body: any) => {
      responseBody = body;
      return originalJson(body);
    }) as any;

    res.on('finish', async () => {
      if (res.statusCode >= 400) {
        return;
      }

      const resolvedEntityId =
        entityId ||
        responseBody?.id?.toString?.() ||
        responseBody?.[0]?.id?.toString?.();

      const afterState =
        req.method === 'DELETE'
          ? null
          : resolvedEntityId
            ? await this.safeFindEntity(routeConfig.target, resolvedEntityId)
            : responseBody || null;

      await this.auditService.log({
        userId: userInfo.userId,
        username: userInfo.username,
        module: routeConfig.module,
        action: req.method,
        entity: routeConfig.entity,
        entityId: resolvedEntityId,
        before: beforeState,
        after: afterState,
        companyId,
      });
    });

    next();
  }

  private cleanPath(path: string): string {
    return path.split('?')[0].replace(/^\/+/, '/');
  }

  private extractRouteKey(path: string): string {
    const segments = path.replace(/^\//, '').split('/').filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[0]}/${segments[1]}`;
    }
    return segments[0] || '';
  }

  private extractCompanyId(req: Request): string | undefined {
    const headerCompanyId = req.headers['x-company-id'];
    const queryCompanyId = req.query?.companyId;

    if (typeof headerCompanyId === 'string' && headerCompanyId) return headerCompanyId;
    if (typeof queryCompanyId === 'string' && queryCompanyId) return queryCompanyId;
    return undefined;
  }

  private extractUser(req: Request): { userId?: string; username?: string } {
    const requestUser = (req as any).user;
    if (requestUser) {
      return {
        userId: requestUser.userId || requestUser.id,
        username: requestUser.username,
      };
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {};
    }

    try {
      const tokenPayload = JSON.parse(Buffer.from(authHeader.split('.')[1], 'base64').toString('utf-8'));
      return {
        userId: tokenPayload.sub,
        username: tokenPayload.username,
      };
    } catch {
      return {};
    }
  }

  private async safeFindEntity(target: EntityTarget<any>, id: string): Promise<any> {
    try {
      const repo = this.dataSource.getRepository(target);
      return await repo.findOne({ where: { id } as any });
    } catch {
      return null;
    }
  }
}
