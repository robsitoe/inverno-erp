import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentGatewayConfig } from './entities/payment-gateway-config.entity';

@Controller('payment-gateways')
@UseGuards(JwtAuthGuard)
export class PaymentGatewaysController {
    constructor(private readonly service: PaymentGatewaysService) {}

    @Get()
    findAll(@Query('companyId') companyId?: string) {
        return this.service.findAll(companyId);
    }

    @Get(':provider/config')
    getConfig(
        @Param('provider') provider: string,
        @Query('companyId') companyId?: string,
    ) {
        return this.service.getActiveConfig(provider.toUpperCase(), companyId);
    }

    @Post()
    async save(@Body() data: Partial<PaymentGatewayConfig>) {
        const config = await this.service.save(data);
        // Mask secrets before returning
        return {
            ...config,
            apiKey: config?.apiKey ? '••••' + config.apiKey.slice(-4) : '',
            apiSecret: config?.apiSecret ? '••••••••' : '',
        };
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Query('companyId') companyId?: string) {
        return this.service.remove(id, companyId);
    }
}
