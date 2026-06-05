import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { PaymentGatewayConfig } from './entities/payment-gateway-config.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentGatewaysService {
    constructor(
        private readonly tenancyService: TenancyService,
        @InjectRepository(PaymentGatewayConfig)
        private readonly defaultRepo: Repository<PaymentGatewayConfig>,
    ) {}

    private async getRepo(companyId?: string): Promise<Repository<PaymentGatewayConfig>> {
        const targetId = companyId || TenancyContext.getCompanyId();
        if (!targetId) return this.defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(PaymentGatewayConfig);
    }

    async findAll(companyId?: string): Promise<PaymentGatewayConfig[]> {
        const repo = await this.getRepo(companyId);
        return repo.find({
            where: companyId ? { companyId } : undefined,
            order: { provider: 'ASC' },
        });
    }

    async findByProvider(provider: string, companyId?: string): Promise<PaymentGatewayConfig | null> {
        const repo = await this.getRepo(companyId);
        return repo.findOne({ where: { provider, companyId } });
    }

    async save(data: Partial<PaymentGatewayConfig>): Promise<PaymentGatewayConfig> {
        const repo = await this.getRepo(data.companyId);

        const existing = await repo.findOne({
            where: { provider: data.provider, companyId: data.companyId },
        });

        if (existing) {
            await repo.update(existing.id, data);
            return repo.findOne({ where: { id: existing.id } }) as Promise<PaymentGatewayConfig>;
        }

        const entity = repo.create({ id: uuidv4(), ...data });
        return repo.save(entity);
    }

    async remove(id: string, companyId?: string): Promise<void> {
        const repo = await this.getRepo(companyId);
        await repo.delete(id);
    }

    async getActiveConfig(provider: string, companyId?: string) {
        const config = await this.findByProvider(provider, companyId);

        if (config?.isActive) {
            return {
                agentCode: config.agentCode,
                apiKey: config.apiKey,
                apiSecret: config.apiSecret,
                serviceProviderCode: config.serviceProviderCode,
                baseUrl: config.baseUrl,
                sandboxMode: config.sandboxMode,
                timeoutSeconds: config.timeoutSeconds || 60,
                source: 'database',
            };
        }

        // Fallback to environment variables
        const envDefaults: Record<string, any> = {
            EMOLA: {
                agentCode: process.env.EMOLA_AGENT_CODE || '',
                apiKey: process.env.EMOLA_API_KEY || '',
                apiSecret: process.env.EMOLA_API_SECRET || '',
                serviceProviderCode: process.env.EMOLA_SERVICE_PROVIDER_CODE || '',
                baseUrl: process.env.EMOLA_BASE_URL || 'https://api.emola.mz/v1',
                sandboxMode: process.env.EMOLA_SANDBOX !== 'false',
                timeoutSeconds: parseInt(process.env.EMOLA_TIMEOUT || '60'),
                source: 'env',
            },
            MPESA: {
                agentCode: process.env.MPESA_AGENT_CODE || '',
                apiKey: process.env.MPESA_API_KEY || '',
                apiSecret: process.env.MPESA_PUBLIC_KEY || '',
                serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE || '',
                baseUrl: process.env.MPESA_BASE_URL || 'https://api.sandbox.vm.co.mz/ipg/v1x/',
                sandboxMode: process.env.MPESA_SANDBOX !== 'false',
                timeoutSeconds: 60,
                source: 'env',
            },
            MKESH: {
                agentCode: process.env.MKESH_AGENT_CODE || '',
                apiKey: process.env.MKESH_API_KEY || '',
                apiSecret: process.env.MKESH_API_SECRET || '',
                serviceProviderCode: process.env.MKESH_SERVICE_PROVIDER_CODE || '',
                baseUrl: process.env.MKESH_BASE_URL || 'https://api.mkesh.mz/v1',
                sandboxMode: true,
                timeoutSeconds: 60,
                source: 'env',
            },
        };

        return envDefaults[provider] || null;
    }
}
