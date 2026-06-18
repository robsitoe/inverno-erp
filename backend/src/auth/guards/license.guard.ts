import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional } from '@nestjs/common';
import { LicensesService } from '../../licenses/licenses.service';
import { PhoneHomeService } from '../../licenses/phone-home.service';

/**
 * LicenseGuard — protects routes that require a valid license.
 *
 * Checks local DB status first; also consults PhoneHomeService in-memory
 * block cache (populated by the periodic phone-home cron) so that remote
 * revocations take effect without a server restart.
 */
@Injectable()
export class LicenseGuard implements CanActivate {
    constructor(
        private readonly licensesService: LicensesService,
        @Optional() private readonly phoneHome?: PhoneHomeService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const companyId = request.companyId
            || request.headers['x-company-id']
            || request.query?.companyId
            || request.body?.companyId;

        if (!companyId) {
            return true;
        }

        // Fast in-memory check from last phone-home result
        if (this.phoneHome?.isBlockedLocally(companyId)) {
            throw new ForbiddenException(
                `Licença revogada remotamente para a empresa ${companyId}. ` +
                `Contacte o fornecedor para regularizar o pagamento.`
            );
        }

        const status = await this.licensesService.getStatus(companyId);

        if (!status.valid) {
            throw new ForbiddenException(
                `Licença inválida ou expirada para a empresa ${companyId}. ` +
                `Estado: ${status.status}. Por favor, renove a sua licença.`
            );
        }

        request.license = status;
        return true;
    }
}
