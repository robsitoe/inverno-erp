import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicensesService } from '../../licenses/licenses.service';
import { PhoneHomeService } from '../../licenses/phone-home.service';
import { License } from '../../licenses/entities/license.entity';

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
        @Optional() @InjectRepository(License) private readonly licenseRepo?: Repository<License>,
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

        // Offline grace period check: if phone-home is configured but the server
        // has been unreachable for more than offlineGraceDays, block access.
        if (this.licenseRepo) {
            const lic = await this.licenseRepo.findOne({ where: { companyId } });
            if (lic && lic.offlineGraceDays > 0 && lic.lastPhoneHomeAt) {
                const daysSinceContact = (Date.now() - new Date(lic.lastPhoneHomeAt).getTime()) / 86_400_000;
                if (daysSinceContact > lic.offlineGraceDays) {
                    throw new ForbiddenException(
                        `Verificação de licença necessária. Sem contacto com o servidor central há ${Math.floor(daysSinceContact)} dias ` +
                        `(limite: ${lic.offlineGraceDays} dias). Ligue à internet para continuar.`
                    );
                }
            }
        }

        request.license = status;
        return true;
    }
}
