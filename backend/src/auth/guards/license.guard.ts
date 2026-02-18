import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { LicensesService } from '../../licenses/licenses.service';

/**
 * LicenseGuard — protects routes that require a valid license.
 * 
 * Usage: @UseGuards(JwtAuthGuard, LicenseGuard)
 * 
 * The guard reads the companyId from the request (set by TenancyMiddleware)
 * and checks the license status from the database (server-side time, tamper-proof).
 */
@Injectable()
export class LicenseGuard implements CanActivate {
    constructor(private readonly licensesService: LicensesService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const companyId = request.companyId
            || request.headers['x-company-id']
            || request.query?.companyId
            || request.body?.companyId;

        if (!companyId) {
            // No company context — allow (will be caught by other guards)
            return true;
        }

        const status = await this.licensesService.getStatus(companyId);

        if (!status.valid) {
            throw new ForbiddenException(
                `Licença inválida ou expirada para a empresa ${companyId}. ` +
                `Estado: ${status.status}. Por favor, renove a sua licença.`
            );
        }

        // Attach license info to request for downstream use
        request.license = status;

        return true;
    }
}
