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
import { TripsService } from './trips.service';

@Controller('mobile')
export class MobileController {
    constructor(
        private readonly mobileService: MobileService,
        private readonly tripsService: TripsService,
    ) { }

    // ── Trips / Viagens (reconciliation) ──────────────────────────────────────

    @UseGuards(AuthGuard('jwt'))
    @Get('trips')
    @ApiOperation({ summary: 'List trips (optionally filter by status)' })
    async listTrips(@Request() req, @Query('status') status?: any) {
        return this.tripsService.listTrips(req.user.companyId, status);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('trips/active')
    @ApiOperation({ summary: 'Get the driver active trip' })
    async getActiveTrip(@Request() req) {
        const { employeeId, companyId } = req.user;
        return this.tripsService.getActiveTrip(employeeId, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('trips/:id')
    async getTrip(@Request() req, @Param('id') id: string) {
        return this.tripsService.getTrip(req.user.companyId, id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('trips/open')
    @ApiOperation({ summary: 'Warehouse keeper loads truck and opens a trip' })
    async openTrip(@Request() req, @Body() body: any) {
        const { companyId, name } = req.user;
        return this.tripsService.openTrip(companyId, {
            truckPlate: body.truckPlate,
            driverId: body.driverId,
            driverName: body.driverName,
            loadedOut: body.loadedOut,
            openedBy: body.openedBy || name,
            notes: body.notes,
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('trips/:id/return')
    @ApiOperation({ summary: 'Warehouse keeper registers returned stock (cylinder reconciliation)' })
    async returnTrip(@Request() req, @Param('id') id: string, @Body() body: any) {
        const { companyId, name } = req.user;
        return this.tripsService.closeTripReturn(companyId, id, {
            returnedStock: body.returnedStock,
            declaredCash: body.declaredCash,
            closedBy: body.closedBy || name,
            notes: body.notes,
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('trips/:id/reconcile-cash')
    @ApiOperation({ summary: 'Cashier confirms cash received from driver' })
    async reconcileCash(@Request() req, @Param('id') id: string, @Body() body: any) {
        const { companyId, name } = req.user;
        return this.tripsService.reconcileCash(companyId, id, {
            declaredCash: body.declaredCash,
            cashReceivedBy: body.cashReceivedBy || name,
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('trips/:id/deposit')
    @ApiOperation({ summary: 'Deposits team registers a bank deposit against the trip' })
    async depositTrip(@Request() req, @Param('id') id: string, @Body() body: any) {
        return this.tripsService.registerDeposit(req.user.companyId, id, Number(body.amount) || 0);
    }

    // --- Reseller Endpoints ---

    @UseGuards(AuthGuard('jwt'))
    @Get('reseller/projections')
    async getProjections(@Request() req) {
        const { userId, customerId: tokenCustomerId, companyId: tokenCompanyId } = req.user;
        const user = await this.mobileService.getUserById(userId);

        const customerId = user?.customerId || tokenCustomerId;
        const companyId = user?.companyId || tokenCompanyId;

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
        const { userId, companyId: tokenCompanyId } = req.user;
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, `\n[AUDIT-CTRL] POST /reseller/order by user ${userId} at ${new Date().toISOString()}\n`);

        // ALWAYS fetch latest user data to avoid stale token issues
        const user = await this.mobileService.getUserById(userId);
        if (!user) {
            throw new BadRequestException('Utilizador não validado. Por favor, faça login novamente.');
        }

        const customerId = user.customerId;
        const companyId = user.companyId || tokenCompanyId;

        if (!customerId) {
            throw new BadRequestException('A sua conta ainda não tem um perfil de cliente associado (customerId em falta).');
        }
        console.log(`[MobileController] Attempting order: Company: ${companyId}, Customer: ${customerId}, User: ${userId}`);
        try {
            return await this.mobileService.createResellerOrder(
                customerId,
                orderData,
                companyId,
                userId
            );
        } catch (error: any) {
            console.error('[MobileController] Error creating order:', error);

            // If it's already an HttpException, propagate it
            if (error.status && error.response) {
                throw error;
            }

            const details = error.response || error.message;
            throw new BadRequestException({
                message: 'Erro interno ao criar encomenda',
                details: details,
                errorName: error.name
            });
        }
    }

    // --- Delivery Point Endpoints ---

    @UseGuards(AuthGuard('jwt'))
    @Get('reseller/delivery-points')
    async getDeliveryPoints(@Request() req) {
        let { customerId, companyId, userId } = req.user;
        if (!customerId && userId) {
            const user = await this.mobileService.getUserById(userId);
            if (user) {
                customerId = user.customerId;
                companyId = companyId || user.companyId;
            }
        }
        return this.mobileService.getDeliveryPoints(customerId, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('reseller/delivery-points')
    async createDeliveryPoint(@Request() req, @Body() data: any) {
        let { customerId, companyId, userId } = req.user;

        // Fallback for stale tokens: Fetch latest user data from DB if customerId missing
        if (!customerId && userId) {
            console.log(`[MobileController] customerId missing in token for user ${userId}. Fetching from DB...`);
            const user = await this.mobileService.getUserById(userId);
            if (user) {
                customerId = user.customerId;
                companyId = companyId || user.companyId;
            }
        }

        try {
            return await this.mobileService.createDeliveryPoint(customerId, data, companyId);
        } catch (error: any) {
            console.error('[MobileController] Error creating delivery point:', error);
            if (error.response) throw error;
            throw new BadRequestException({
                message: 'Erro ao criar ponto de entrega',
                details: error.message
            });
        }
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('reseller/delivery-points/:id')
    async updateDeliveryPoint(@Request() req, @Param('id') id: string, @Body() data: any) {
        let { customerId, companyId, userId } = req.user;
        if (!customerId && userId) {
            const user = await this.mobileService.getUserById(userId);
            if (user) {
                customerId = user.customerId;
                companyId = companyId || user.companyId;
            }
        }
        return this.mobileService.updateDeliveryPoint(id, customerId, data, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('reseller/delivery-points/:id')
    async deleteDeliveryPoint(@Request() req, @Param('id') id: string) {
        let { customerId, companyId, userId } = req.user;
        if (!customerId && userId) {
            const user = await this.mobileService.getUserById(userId);
            if (user) {
                customerId = user.customerId;
                companyId = companyId || user.companyId;
            }
        }
        return this.mobileService.deleteDeliveryPoint(id, customerId, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('route/optimize')
    async getOptimizedRoute(@Request() req, @Body() data: { docIds: string[] }) {
        const { companyId } = req.user;
        return this.mobileService.getOptimizedSequence(data.docIds, companyId);
    }

    // --- Driver Endpoints ---

    @UseGuards(AuthGuard('jwt'))
    @Post('driver/status')
    async updateDriverStatus(@Request() req, @Body() statusData) {
        const truckPlate = statusData.truckPlate || 'T-REGO-001';
        const { companyId, employeeId } = req.user;
        return this.mobileService.updateTruckStatus(
            truckPlate,
            statusData,
            companyId,
            employeeId
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
    @Post('driver/load-truck/:plate')
    @ApiOperation({ summary: 'Load or adjust truck cylinder inventory (driver carga/descarga)' })
    async loadTruck(@Request() req, @Param('plate') plate: string, @Body() body: any) {
        const { employeeId, companyId } = req.user;
        if (!body?.inventory) throw new BadRequestException('O campo "inventory" é obrigatório.');
        return this.mobileService.loadTruckInventory(
            plate,
            companyId,
            body.inventory,
            employeeId,
            body.mode === 'ADD' ? 'ADD' : 'SET',
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('driver/pending-deliveries')
    async getPendingDeliveries(@Request() req) {
        const { userId, companyId: tokenCompanyId } = req.user;
        const user = await this.mobileService.getUserById(userId);
        let companyId = user?.companyId || tokenCompanyId;

        // EMERGENCY FIX: Patch the driver without companyId (U-1774617583683)
        if (userId === 'U-1774617583683' && !companyId) {
            console.warn(`[MobileController] ALERT: Fixing companyId for driver ${userId} -> 003`);
            companyId = '003';
            // Persist the fix in DB so we never need this again
            try {
                const globalUser = await this.mobileService.getUserById(userId);
                if (globalUser) {
                    globalUser.companyId = '003';
                    // Using internal Repo access to save
                    await (this.mobileService as any).userRepo.save(globalUser);
                }
            } catch (e) {
                console.error('[MobileController] Patch failed but continuing with memory ID:', e.message);
            }
        }

        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, `\n[AUDIT-CTRL] GET /driver/pending-deliveries. User: ${userId}, Company: ${companyId}\n`);

        if (!companyId) {
            throw new BadRequestException('Não foi possível determinar a sua empresa. Faça login novamente.');
        }

        return this.mobileService.getPendingDeliveries(companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('driver/claim-delivery/:id')
    async claimDelivery(@Request() req, @Param('id') documentId: string) {
        const { userId, employeeId: tokenEmployeeId, companyId: tokenCompanyId } = req.user;
        const user = await this.mobileService.getUserById(userId);

        const employeeId = user?.employeeId || tokenEmployeeId;
        const companyId = user?.companyId || tokenCompanyId;

        if (!employeeId || !companyId) {
            throw new BadRequestException('Perfil de motorista ou empresa não identificados no sistema.');
        }

        return this.mobileService.assignDriverToDelivery(documentId, employeeId, companyId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('driver/cancel-delivery/:id')
    async cancelDelivery(@Request() req, @Param('id') documentId: string, @Body() body: { reason: string }) {
        const { companyId: tokenCompanyId, userId } = req.user;
        const user = await this.mobileService.getUserById(userId);
        const companyId = user?.companyId || tokenCompanyId;

        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, `\n[AUDIT-LOGISTIC] Order ${documentId} RELEASED by user ${userId}. Reason: ${body.reason || 'No reason provided'}\n`);

        return this.mobileService.releaseDelivery(documentId, companyId);
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

    @UseGuards(AuthGuard('jwt'))
    @Get(['inventory', 'gas-types'])
    @ApiOperation({ summary: 'Get active gas inventory with prices relative to user profile' })
    getInventory(@Query('companyId') companyId?: string, @Request() req?: any) {
        const { userId, companyId: tokenCompanyId } = req.user;
        const targetCompanyId = companyId || tokenCompanyId;
        return this.mobileService.getGasInventory(targetCompanyId, userId);
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
        let { customerId, employeeId, companyId, userId } = req.user;

        // Fallback for stale tokens: Fetch latest profile data
        if (!customerId && !employeeId && userId) {
            const user = await this.mobileService.getUserById(userId);
            if (user) {
                customerId = user.customerId;
                employeeId = user.employeeId;
                companyId = companyId || user.companyId;
            }
        }

        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, `\n[AUDIT-CTRL] GET /history by user ${userId}. Customer: ${customerId}, Employee: ${employeeId}, Company: ${companyId}\n`);

        if (employeeId) {
            return this.mobileService.getDriverHistory(employeeId, companyId);
        } else if (customerId) {
            return this.mobileService.getResellerHistory(customerId, companyId);
        }
        return { orders: [], payments: [] };
    }
}
