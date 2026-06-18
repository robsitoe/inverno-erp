import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional, Logger } from '@nestjs/common';
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

        // Operational token check — cryptographically tamper-proof.
        // Only active when phone-home is configured (operationalToken is present).
        // If the token is expired the client MUST reconnect to get a new one —
        // modifying the local database does not help because the signature is invalid.
        if (this.licenseRepo) {
            const lic = await this.licenseRepo.findOne({ where: { companyId } });
            if (lic?.operationalToken) {
                try {
                    this.licensesService.verifyOperationalToken(lic.operationalToken);
                    // Token valid — passes. Expiry is encoded inside the JWT.
                } catch {
                    throw new ForbiddenException(
                        `Token operacional expirado para a empresa ${companyId}. ` +
                        `Ligue à internet para renovar a licença (contacto com servidor central necessário).`
                    );
                }
            }
        }

        request.license = status;
        return true;
    }
}
