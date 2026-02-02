import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenancyContext } from './tenancy.context';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const companyId = req.headers['x-company-id'] as string || req.query.companyId as string;

        if (companyId) {
            console.log(`[TenancyMiddleware] Context set for companyId: ${companyId} (${req.method} ${req.url})`);
            TenancyContext.run(companyId, next);
        } else {
            console.warn(`[TenancyMiddleware] No companyId found in headers/query for ${req.method} ${req.url}`);
            next();
        }
    }
}
