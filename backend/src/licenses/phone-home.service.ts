import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License, LicenseStatus } from './entities/license.entity';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

/**
 * Phone-home: periodically validates each active license against the
 * central license authority (PHONE_HOME_URL). If the central server marks
 * a license as REVOKED the local record is updated and clients are blocked
 * on the next request without any manual intervention on the client server.
 *
 * Set PHONE_HOME_URL=https://licenses.inverno.co.mz in the client's .env.
 * Leave it unset for pure offline / SaaS-hosted installs (no-op).
 */
@Injectable()
export class PhoneHomeService {
    private readonly logger = new Logger(PhoneHomeService.name);
    private readonly centralUrl: string | undefined;

    // In-memory block cache: companyId → blocked until timestamp
    private readonly blockCache = new Map<string, number>();

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
        @InjectRepository(License)
        private readonly licenseRepo: Repository<License>,
    ) {
        this.centralUrl = this.config.get<string>('PHONE_HOME_URL');
        if (this.centralUrl) {
            this.logger.log(`Phone-home enabled → ${this.centralUrl}`);
        }
    }

    /** Called by LicenseGuard for a fast in-memory revocation check. */
    isBlockedLocally(companyId: string): boolean {
        const until = this.blockCache.get(companyId);
        if (!until) return false;
        if (Date.now() < until) return true;
        this.blockCache.delete(companyId);
        return false;
    }

    /** Runs every 4 hours. Validates all non-revoked licenses. */
    @Cron(CronExpression.EVERY_4_HOURS)
    async validateAll() {
        if (!this.centralUrl) return;
        const licenses = await this.licenseRepo.find({
            where: [{ status: LicenseStatus.ACTIVE }, { status: LicenseStatus.GRACE }],
        });
        for (const lic of licenses) {
            await this.validateOne(lic).catch(() => null);
        }
    }

    /** Validates a single license immediately — call after activation. */
    async validateOne(lic: License): Promise<void> {
        if (!this.centralUrl) return;
        try {
            const res$ = this.http.get(`${this.centralUrl}/licenses/remote-status`, {
                params: { companyId: lic.companyId, token: lic.licenseToken || '' },
                headers: { 'x-phone-home': '1' },
            }).pipe(
                timeout(8000),
                catchError(() => of({ data: null })),
            );
            const { data } = await firstValueFrom(res$);
            if (!data) return; // Central server unreachable — fail open (don't block)

            if (data.status === 'REVOKED' || data.isRevoked) {
                this.logger.warn(`License revoked remotely for ${lic.companyId}`);
                await this.licenseRepo.update(lic.id, {
                    status: LicenseStatus.REVOKED,
                    isRevoked: true,
                    revokedAt: new Date(),
                    revokedReason: data.reason || 'Revogado pelo servidor central.',
                });
                // Block in-memory for 24 h (survives between cron runs)
                this.blockCache.set(lic.companyId, Date.now() + 24 * 60 * 60 * 1000);
            } else if (data.status === 'ACTIVE' && lic.status === LicenseStatus.REVOKED) {
                // Reactivated remotely (payment received)
                await this.licenseRepo.update(lic.id, {
                    status: LicenseStatus.ACTIVE,
                    isRevoked: false,
                    expiresAt: data.expiresAt ? new Date(data.expiresAt) : lic.expiresAt,
                    lastPhoneHomeAt: new Date(),
                });
                this.blockCache.delete(lic.companyId);
                this.logger.log(`License reactivated remotely for ${lic.companyId}`);
            } else {
                // Successful contact, license still valid — store fresh operational token
                const opTokenExpiry = new Date();
                opTokenExpiry.setDate(opTokenExpiry.getDate() + 30);
                await this.licenseRepo.update(lic.id, {
                    lastPhoneHomeAt: new Date(),
                    operationalToken: data.operationalToken || lic.operationalToken,
                    operationalTokenExpiresAt: data.operationalToken ? opTokenExpiry : lic.operationalTokenExpiresAt,
                });
            }
        } catch (err) {
            this.logger.error(`Phone-home failed for ${lic.companyId}: ${err.message}`);
        }
    }
}
