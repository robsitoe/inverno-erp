import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentGatewayConfig } from './entities/payment-gateway-config.entity';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentGatewaysController } from './payment-gateways.controller';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PaymentGatewayConfig]),
        TenancyModule,
    ],
    controllers: [PaymentGatewaysController],
    providers: [PaymentGatewaysService],
    exports: [PaymentGatewaysService],
})
export class PaymentGatewaysModule {}
