import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MobileService } from './mobile.service';

@Controller('mobile')
export class MobileController {
    constructor(private readonly mobileService: MobileService) { }

    // --- Reseller Endpoints ---

    @UseGuards(AuthGuard('jwt'))
    @Get('reseller/projections')
    async getProjections(@Request() req) {
        const { customerId, companyId } = req.user;
        return this.mobileService.getResellerStockProjections(
            customerId,
            companyId,
        );
    }

    @Get('companies')
    async getCompanies() {
        return this.mobileService.getCompanies();
    }

    @Post('register')
    async register(@Body() registerData) {
        const companyId = registerData.companyId;
        return this.mobileService.register(registerData, companyId);
    }


    @UseGuards(AuthGuard('jwt'))
    @Post('reseller/order')
    async createOrder(@Request() req, @Body() orderData) {
        const { customerId, companyId } = req.user;
        try {
            return await this.mobileService.createResellerOrder(
                customerId,
                orderData,
                companyId,
            );
        } catch (error: any) {
            console.error('[MobileController] Error creating order:', error);

            // If it's already an HttpException (like BadRequest or NotFound from services), propagate it
            if (error.status && error.response) {
                throw error;
            }

            const details = error.response || error.message;
            throw new BadRequestException({
                message: 'Erro interno ao criar encomenda',
                details: details,
                errorName: error.name,
                stack: error.stack?.split('\n')[0]
            });
        }
    }

    // --- Delivery Point Endpoints ---

    @UseGuards(AuthGuard('jwt'))
    @Get('reseller/delivery-points')
    async getDeliveryPoints(@Request() req) {
        const { customerId, companyId } = req.user;
        return this.mobileService.getDeliveryPoints(customerId, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('reseller/delivery-points')
    async createDeliveryPoint(@Request() req, @Body() data: any) {
        const { customerId, companyId } = req.user;
        return this.mobileService.createDeliveryPoint(customerId, data, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('reseller/delivery-points/:id')
    async updateDeliveryPoint(@Request() req, @Param('id') id: string, @Body() data: any) {
        const { customerId, companyId } = req.user;
        return this.mobileService.updateDeliveryPoint(id, customerId, data, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('reseller/delivery-points/:id')
    async deleteDeliveryPoint(@Request() req, @Param('id') id: string) {
        const { customerId, companyId } = req.user;
        return this.mobileService.deleteDeliveryPoint(id, customerId, companyId);
    }

    // --- Driver Endpoints ---

    @UseGuards(AuthGuard('jwt'))
    @Post('driver/status')
    async updateDriverStatus(@Request() req, @Body() statusData) {
        const truckPlate = statusData.truckPlate || 'T-REGO-001';
        const companyId = req.user.companyId;
        return this.mobileService.updateTruckStatus(
            truckPlate,
            statusData,
            companyId,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('driver/direct-sale')
    async createDirectSale(@Request() req, @Body() saleData) {
        const { employeeId, companyId } = req.user;
        const truckPlate = saleData.truckPlate || 'T-REGO-001';
        return this.mobileService.createDirectSale(
            employeeId,
            truckPlate,
            saleData,
            companyId,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('driver/inventory/:plate')
    async getTruckInventory(@Request() req, @Param('plate') plate: string) {
        const companyId = req.user.companyId;
        return this.mobileService.getTruckInventory(plate, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('driver/pending-deliveries')
    async getPendingDeliveries(@Request() req) {
        const companyId = req.user.companyId;
        return this.mobileService.getPendingDeliveries(companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('driver/claim-delivery/:id')
    async claimDelivery(@Request() req, @Param('id') documentId: string) {
        const { employeeId, companyId } = req.user;
        return this.mobileService.assignDriverToDelivery(documentId, employeeId, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('driver/assigned-route')
    async getAssignedRoute(@Request() req) {
        const { employeeId, companyId } = req.user;
        return this.mobileService.getAssignedRoute(employeeId, companyId);
    }

    // --- Payment Endpoints ---

    @Get('payment-methods')
    async getPaymentMethods(@Query('companyId') companyId: string, @Request() req: any) {
        const targetCompanyId = companyId || req?.user?.companyId;
        return this.mobileService.getPaymentMethods(targetCompanyId);
    }

    @Post('mpesa/pay')
    async processPayment(@Body() paymentData) {
        return { status: 'PENDING', message: 'Payment initiated via M-Pesa' };
    }

    @Get(['inventory', 'gas-types'])
    @ApiOperation({ summary: 'Get active gas inventory with prices' })
    getInventory(@Query('companyId') companyId?: string, @Request() req?: any) {
        // Use query param OR logged in user's companyId
        const targetCompanyId = companyId || req?.user?.companyId;
        return this.mobileService.getGasInventory(targetCompanyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('admin/approve/:userId')
    async approveUser(@Param('userId') userId: string, @Request() req) {
        const companyId = req.user.companyId;
        return this.mobileService.approveMobileUser(userId, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('admin/pending')
    async getPendingUsers(@Request() req) {
        return this.mobileService.getPendingUsers();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('admin/approved')
    async getApprovedUsers(@Request() req) {
        return this.mobileService.getApprovedUsers();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('admin/drivers')
    async getDrivers(@Request() req) {
        const companyId = req.user.companyId;
        return this.mobileService.getDrivers(companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('admin/assign-route')
    async assignRoute(@Request() req, @Body() data: { employeeId: string, docIds: string[] }) {
        const companyId = req.user.companyId;
        return this.mobileService.assignRoute(data.employeeId, data.docIds, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('history')
    @ApiOperation({ summary: 'Get order and payment history for the current user' })
    async getHistory(@Request() req) {
        const { customerId, employeeId, companyId } = req.user;
        if (employeeId) {
            return this.mobileService.getDriverHistory(employeeId, companyId);
        } else if (customerId) {
            return this.mobileService.getResellerHistory(customerId, companyId);
        }
        return { orders: [], payments: [] };
    }
}
