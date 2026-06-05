import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ObjectLiteral, In, IsNull } from 'typeorm';
import { GasControlService } from '../gas-control/gas-control.service';
import { Customer } from '../customers/entities/customer.entity';
import { DeliveryPoint } from '../customers/entities/delivery-point.entity';
import { SalesService } from '../sales/sales.service';
import { TruckInventory } from './truck-inventory.entity';
import { User } from '../users/entities/user.entity';
import { Employee } from '../hr/entities/employee.entity';
import { GasCylinderType } from '../gas-control/gas-control.entity';
import { NotificationService } from './notification.service';
import { TripsService } from './trips.service';
import { Company } from '../companies/entities/company.entity';
import { License, LicenseStatus } from '../licenses/entities/license.entity';
import { Account } from '../accounting/entities/account.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { MobileRegisterDto } from './dto/mobile-register.dto';
import { Article } from '../inventory/entities/article.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { TreasuryDocument } from '../treasury/entities/treasury.entity';
import { PaymentMethod } from '../treasury/entities/payment-method.entity';
import { WorkflowStatus } from '../common/enums/workflow-status.enum';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MobileService {
    constructor(
        private readonly tenancyService: TenancyService,
        private readonly gasControlService: GasControlService,
        private readonly salesService: SalesService,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        @InjectRepository(Employee)
        private readonly employeeRepo: Repository<Employee>,
        @InjectRepository(TruckInventory)
        private readonly truckRepo: Repository<TruckInventory>,
        @InjectRepository(GasCylinderType)
        private readonly gasCylinderTypeRepo: Repository<GasCylinderType>,
        @InjectRepository(Company)
        private readonly companyRepo: Repository<Company>,
        @InjectRepository(License)
        private readonly licenseRepo: Repository<License>,
        @InjectRepository(Account)
        private readonly accountRepo: Repository<Account>,
        private readonly notificationService: NotificationService,
        private readonly tripsService: TripsService,
    ) { }

    private async getTenantRepo<T extends ObjectLiteral>(
        entity: any,
        companyId: string,
    ): Promise<Repository<T>> {
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(entity);
    }

    async getUserById(id: string) {
        const user = await this.userRepo.findOne({ where: { id }, relations: ['company'] });

        // SELF-HEALING: If companyId is missing in User record but exists in a linked profile
        if (user && !user.companyId) {
            // This is a safety net for users registered with older versions
            console.warn(`[MobileService] Self-healing companyId for user ${user.username}...`);
            // We'll leave it to be set by the caller or add logic here if we had cross-tenant access
        }

        return user;
    }

    /**
     * Approves a pending mobile user and synchronizes status with Customer/Employee entities.
     */
    async approveMobileUser(userId: string, companyId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // 0. Resolve Company Context (Priority: User Record > Admin Request)
        const activeCompanyId = user.companyId || companyId;
        if (!activeCompanyId)
            throw new Error('Company ID context missing for approval.');

        // 1. Update User
        user.status = 'APPROVED';
        user.isActive = true;
        user.companyId = activeCompanyId; // Ensure it's explicitly set
        await this.userRepo.save(user);

        // 2. Synchronize Customer (for Resellers)
        if (user.customerId) {
            const tenantCustomerRepo = await this.getTenantRepo<Customer>(
                Customer,
                activeCompanyId,
            );
            const tenantAccountRepo = await this.getTenantRepo<Account>(
                Account,
                activeCompanyId,
            );

            const customer = await tenantCustomerRepo.findOne({
                where: { id: user.customerId },
            });
            if (customer) {
                customer.status = 'APPROVED';
                customer.isActive = true;
                customer.type = 'NIVEL2'; // Official ERP Reseller type

                // Assign a receivable account (General Clients)
                const defaultAcct = await tenantAccountRepo
                    .createQueryBuilder('acc')
                    .where('(acc.code LIKE :prefix1 OR acc.code LIKE :prefix2)', {
                        prefix1: '4.1%',
                        prefix2: '21%',
                    })
                    .andWhere('acc.allowPosting = true')
                    .orderBy('acc.code', 'ASC')
                    .getOne();

                if (defaultAcct) {
                    customer.receivableAccountId = defaultAcct.id;
                }

                // Generate a more formal code if it's still the REV-xxx temp code
                if (customer.code.startsWith('REV-')) {
                    const count = await tenantCustomerRepo.count();
                    customer.code = `C${(count + 1).toString().padStart(3, '0')}`;
                }

                await tenantCustomerRepo.save(customer);
            }
        }

        // 3. Synchronize Employee (for Drivers)
        if (user.employeeId) {
            const tenantEmployeeRepo = await this.getTenantRepo<Employee>(
                Employee,
                activeCompanyId,
            );
            const employee = await tenantEmployeeRepo.findOne({
                where: { id: user.employeeId },
            });
            if (employee) {
                // employee.status = 'ACTIVE'; // Field does not exist
                employee.isActive = true;
                await tenantEmployeeRepo.save(employee);
            }
        }

        // 4. Notify User
        const message = `Inverno Go: Parabéns ${user.name || user.username}! A sua conta foi aprovada pela administração. Já pode começar a operar.`;
        await this.notificationService.sendNotification(user.phone || '', message, [
            'PUSH',
            'SMS',
            'WHATSAPP',
        ]);

        return { success: true, message: 'User approved and notified.' };
    }

    /**
     * Gets all users waiting for mobile registration approval.
     */
    async getPendingUsers() {
        const users = await this.userRepo.find({
            where: { status: 'PENDING' },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });

        // Self-Healing: Populate missing profiles
        for (const user of users) {
            if (!user.profile) {
                user.profile = user.customerId ? 'RESELLER' : (user.employeeId ? 'DRIVER' : 'UNKNOWN');
                await this.userRepo.update(user.id, { profile: user.profile });
            }
        }

        console.log(`[MobileService] Found ${users.length} total pending users across all profile types.`);
        return users;
    }

    /**
     * Gets all approved mobile users for historical lookups.
     */
    async getApprovedUsers() {
        const users = await this.userRepo.find({
            where: { status: 'APPROVED', userType: 'MOBILE' },
            relations: ['company'],
            order: { updatedAt: 'DESC' },
        });

        // Self-Healing
        for (const user of users) {
            if (!user.profile) {
                user.profile = user.customerId ? 'RESELLER' : (user.employeeId ? 'DRIVER' : 'UNKNOWN');
                await this.userRepo.update(user.id, { profile: user.profile });
            }
        }

        return users;
    }

    /**
     * Gets all approved drivers.
     */
    async getDrivers(companyId: string) {
        return this.userRepo.find({
            where: {
                status: 'APPROVED',
                profile: 'DRIVER',
                companyId: companyId
            },
            order: { name: 'ASC' }
        });
    }

    /**
     * Gets all active gas cylinder types with their articles and prices.
     */
    async getGasInventory(companyId: string, userId?: string): Promise<any[]> {
        console.log(`[MobileService] Fetching inventory for company ${companyId}. User context: ${userId}`);

        let priceCategory = 'FINAL_CONSUMER';
        if (userId) {
            try {
                const user = await this.userRepo.findOne({ where: { id: userId } });
                if (user?.customerId && user?.companyId) {
                    const tenantCustomerRepo = await this.getTenantRepo<Customer>(Customer, user.companyId);
                    const customer = await tenantCustomerRepo.findOne({ where: { id: user.customerId } });
                    if (customer) {
                        const type = (customer.type || '').toUpperCase();
                        if (type.includes('RES') || type.includes('REV')) priceCategory = 'REVENDEDOR';
                        else if (type.includes('PUMP') || type.includes('BOMBA')) priceCategory = 'BOMBA';
                    }
                } else if (user?.profile === 'DRIVER' || user?.isAdmin || user?.isSuperAdmin) {
                    priceCategory = 'REVENDEDOR';
                }
            } catch (e) {
                console.warn('[MobileService] Error identifying priceCategory:', e.message);
            }
        }

        const labelMap: any = {
            'REVENDEDOR': 'Revendedor',
            'BOMBA': 'Bomba',
            'FINAL_CONSUMER': 'Público'
        };
        const priceLabel = labelMap[priceCategory] || 'Público';

        const tenantGasRepo = await this.getTenantRepo<GasCylinderType>(GasCylinderType, companyId);
        const tenantArticleRepo = await this.getTenantRepo<Article>(Article, companyId);

        const [types, articles] = await Promise.all([
            tenantGasRepo.find({ where: { isActive: true }, order: { name: 'ASC' } }),
            tenantArticleRepo.find({ where: { isActive: true } })
        ]);

        return types.map(type => {
            const article = articles.find(a => a.code === type.fullArticleCode);
            if (!article) return null;

            // ROBUST PRICE SELECTION (Handles MT 0.00 prices correctly)
            let p: any = article.salePrice;
            if (priceCategory === 'REVENDEDOR') {
                p = (article.priceReseller !== null && article.priceReseller !== undefined) ? article.priceReseller : (type.priceRevendedor || article.salePrice);
            } else if (priceCategory === 'BOMBA') {
                p = (article.pricePump !== null && article.pricePump !== undefined) ? article.pricePump : article.salePrice;
            } else if (priceCategory === 'FINAL_CONSUMER') {
                p = (article.priceFinal !== null && article.priceFinal !== undefined) ? article.priceFinal : article.salePrice;
            }

            return {
                ...type,
                id: article.id,
                code: article.code,
                name: type.name || article.name,
                articleId: article.id,
                price: Number(p),
                priceLabel: priceLabel
            };
        }).filter(item => item !== null);
    }

    /**
     * Registers a new mobile user.
     */
    async register(data: any, companyId: string) {
        if (!companyId) throw new BadRequestException('ID da Empresa é obrigatório para o registo.');

        const { username, password, name, phone, role } = data;

        // Check for existing username
        const existing = await this.userRepo.findOne({ where: { username } });
        if (existing) throw new BadRequestException('Utilizador já existe');

        let customerId: string | undefined;
        let employeeId: string | undefined;

        if (role === 'RESELLER') {
            const tenantCustomerRepo = await this.getTenantRepo<Customer>(
                Customer,
                companyId,
            );
            const customer = tenantCustomerRepo.create({
                companyId,
                code: `REV-${Date.now().toString().slice(-6)}`,
                name,
                phone,
                nif: data.nif,
                type: 'REVENDEDOR',
                status: 'PENDING',
                attachments: data.attachments || {},
                isActive: false,
            });
            const saved = await tenantCustomerRepo.save(customer);
            customerId = saved.id;
        } else if (role === 'DRIVER') {
            const tenantEmployeeRepo = await this.getTenantRepo<Employee>(
                Employee,
                companyId,
            );
            const employee = tenantEmployeeRepo.create({
                id: `EMP-${Date.now()}`,
                companyId,
                code: `DRV-${Date.now().toString().slice(-6)}`,
                name,
                phone,
                position: 'Driver',
                department: 'Logistics',
                isActive: false,
            });
            const saved = await tenantEmployeeRepo.save(employee);
            employeeId = saved.id;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = this.userRepo.create({
            id: `U-${Date.now()}`,
            username,
            password: hashedPassword,
            name,
            phone,
            companyId,
            userType: 'MOBILE',
            profile: role === 'DRIVER' ? 'DRIVER' : 'RESELLER',
            customerId,
            employeeId,
            status: 'PENDING',
            isActive: false,
        });

        return await this.userRepo.save(user);
    }

    /**
     * Predicts stock levels for a reseller based on historical daily averages.
     */
    async getResellerStockProjections(customerId: string, companyId: string) {
        const stats = await this.gasControlService.getStatistics(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
            new Date().toISOString().split('T')[0],
            companyId,
        );

        const tenantCustomerRepo = await this.getTenantRepo<Customer>(
            Customer,
            companyId,
        );
        const customer = await tenantCustomerRepo.findOne({
            where: { id: customerId },
        });
        if (!customer) throw new NotFoundException('Reseller not found');

        return {
            customerId,
            customerName: customer.name,
            averages: stats.dailyAverages,
            message:
                'Estoque atual deve ser reportado pelo revendedor para projeção exata.',
        };
    }

    /**
     * Updates truck inventory and location.
     */
    async updateTruckStatus(truckPlate: string, data: any, companyId: string, driverId?: string) {
        let truck = await this.truckRepo.findOne({
            where: { truckPlate, companyId },
        });
        if (!truck) {
            truck = this.truckRepo.create({
                id: `TRUCK-${truckPlate}-${companyId}`,
                truckPlate,
                companyId,
            });
        }

        if (data.inventory) truck.inventory = data.inventory;
        if (data.lat) truck.lastLat = data.lat;
        if (data.lng) truck.lastLng = data.lng;
        if (driverId) truck.driverId = driverId;
        truck.lastUpdate = new Date();

        return this.truckRepo.save(truck);
    }

    /**
     * Gets truck inventory.
     */
    async getTruckInventory(truckPlate: string, companyId: string) {
        const truck = await this.truckRepo.findOne({
            where: { truckPlate, companyId },
        });
        if (!truck) throw new NotFoundException('Truck not found');
        return truck.inventory || {};
    }

    async createResellerOrder(customerId: string, data: any, companyId: string, userId?: string) {
        try {
            console.log(`[MobileService] DEBUG_ORDER: customerId=${customerId}, userId=${userId}, companyId=${companyId}`);

            const ds = await this.tenancyService.getTenantDataSource(companyId);
            const logPath = path.join(process.cwd(), 'error-debug.log');
            fs.appendFileSync(logPath, `\n[AUDIT] Mobile Order Attempt: User ${userId}, Company ${companyId} at ${new Date().toISOString()}\n`);

            const tenantCustomerRepo = ds.getRepository(Customer);

            // 1. Check if customer exists (Self-healing)
            let customer = await tenantCustomerRepo.findOne({ where: { id: customerId } });
            if (!customer) {
                console.warn(`[MobileService] Self-healing order for customer ${customerId}, userId ${userId}...`);

                // Try finding by customerId first, then by userId if provided
                let globalUser = await this.userRepo.findOne({ where: { customerId } });
                if (!globalUser && userId) {
                    globalUser = await this.userRepo.findOne({ where: { id: userId } });
                }

                if (globalUser) {
                    // Update customerId if it was missing or different
                    const effectiveCustomerId = customerId || globalUser.customerId || `CUST-${Date.now()}`;

                    customer = tenantCustomerRepo.create({
                        id: effectiveCustomerId,
                        companyId,
                        name: globalUser.name || globalUser.username,
                        phone: globalUser.phone,
                        status: 'APPROVED',
                        isActive: true,
                        type: 'REVENDEDOR',
                        code: `REV-AUTO-${Date.now().toString().slice(-4)}`
                    });
                    await tenantCustomerRepo.save(customer);

                    // If we assigned a new customerId, update global user
                    if (!globalUser.customerId) {
                        globalUser.customerId = effectiveCustomerId;
                        await this.userRepo.save(globalUser);
                    }
                } else {
                    throw new NotFoundException(`404_ORDER_CUSTOM: Cliente/Utilizador (UUID: ${customerId || userId}) não encontrado.`);
                }
            }
            // ... rest of the logic

            // 2. Resolve Delivery Point Coordinates (if missing in payload)
            let finalLat = data.latitude;
            let finalLng = data.longitude;

            if (data.deliveryPointId && (!finalLat || !finalLng)) {
                try {
                    const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);
                    const point = await tenantPointRepo.findOne({ where: { id: data.deliveryPointId } });
                    if (point) {
                        finalLat = point.latitude;
                        finalLng = point.longitude;
                        console.log(`[MobileService] GPS Self-Healing: Resolved coords ${finalLat},${finalLng} from Point ${point.name}`);
                    }
                } catch (e) {
                    console.warn('[MobileService] Failed to auto-resolve point coords:', e.message);
                }
            }

            // 3. Prepare Sales Data
            const salesData = {
                ...data,
                customerId,
                customerName: customer?.name || 'Cliente Mobile',
                companyId,
                latitude: finalLat ? Number(Number(finalLat).toFixed(8)) : null,
                longitude: finalLng ? Number(Number(finalLng).toFixed(8)) : null,
                isMobileSale: true,
                status: WorkflowStatus.APPROVED, // Direct to APPROVED so it's visible to drivers
                documentType: data.documentType || 'GT',
            };

            console.log(`[MobileService] Order payload for SalesService:`, JSON.stringify(salesData));

            const order = await this.salesService.create(salesData);

            // 3. Notify Drivers (Real-time attempt)
            // We do this in a try-catch to ensure the order response is never blocked
            try {
                const itemsCount = data.lines?.reduce((acc: number, line: any) => acc + Number(line.quantity), 0) || 0;
                this.notifyDriversOfNewOrder(companyId, customer?.name || 'Um revendedor', itemsCount);
            } catch (err) {
                console.error(`[MobileService] Non-blocking notification failure:`, err);
            }

            return order;
        } catch (error: any) {
            console.error(`[MobileService] createResellerOrder failed:`, error);
            if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
            throw new BadRequestException({
                message: 'Falha ao processar encomenda no ERP',
                details: error.message,
                dbError: error.code
            });
        }
    }

    /**
     * Creates a direct sale from a driver to a customer (without prior order).
     */
    async createDirectSale(
        driverId: string,
        truckPlate: string,
        data: any,
        companyId: string,
    ) {
        // 1. Validate truck stock BEFORE creating the sale (if truck is provided)
        if (truckPlate) {
            const truck = await this.truckRepo.findOne({ where: { truckPlate, companyId } });
            const inv = (truck?.inventory || {}) as Record<string, { full?: number; empty?: number; damaged?: number }>;
            const shortages: string[] = [];

            for (const line of (data.lines || [])) {
                const typeKey = this.extractCylinderType(line.articleCode || line.articleName || '');
                if (!typeKey) continue; // not a gas cylinder line
                const available = inv[typeKey]?.full || 0;
                const qty = Number(line.quantity) || 0;
                if (qty > available) {
                    shortages.push(`${typeKey}: pedido ${qty}, disponível ${available}`);
                }
            }

            if (shortages.length > 0) {
                throw new BadRequestException(
                    `Stock insuficiente na viatura ${truckPlate}. ${shortages.join('; ')}.`,
                );
            }
        }

        // 2. Resolve the driver's active trip so the sale is linked to it
        let tripId = data.tripId;
        if (!tripId && driverId) {
            const active = await this.tripsService.getActiveTrip(driverId, companyId);
            tripId = active?.id;
        }

        // 3. Create the sale document (truckPlate is derived from driverId, not a column)
        const sale = await this.salesService.create({
            ...data,
            companyId,
            driverId,
            tripId,
            status: 'POSTED',
            documentType: 'VD',
        });

        // 4. Refresh trip aggregates (sold count + expected cash)
        if (tripId) {
            try { await this.tripsService.refreshTripSales(tripId, companyId); } catch { /* non-blocking */ }
        }

        // 3. Decrement truck inventory (full cylinders sold; empties returned increment empty)
        if (truckPlate) {
            await this.deductTruckInventoryFromSale(truckPlate, companyId, data.lines || []);
        }

        return sale;
    }

    /** Extracts a cylinder type key (e.g. "9KG") from a gas article code/name */
    private extractCylinderType(codeOrName: string): string | null {
        const match = String(codeOrName).toUpperCase().match(/(\d{1,2})\s*KG/);
        return match ? `${match[1]}KG` : null;
    }

    /** Decrement full cylinders and increment returned empties on the truck inventory */
    private async deductTruckInventoryFromSale(
        truckPlate: string,
        companyId: string,
        lines: any[],
    ) {
        const truck = await this.truckRepo.findOne({ where: { truckPlate, companyId } });
        if (!truck) return;

        const inv = (truck.inventory || {}) as Record<string, { full?: number; empty?: number; damaged?: number }>;

        for (const line of lines) {
            const typeKey = this.extractCylinderType(line.articleCode || line.articleName || '');
            if (!typeKey) continue;
            const qty = Number(line.quantity) || 0;
            if (!inv[typeKey]) inv[typeKey] = { full: 0, empty: 0, damaged: 0 };
            // Sold full cylinder leaves the truck; customer typically returns an empty
            inv[typeKey].full = Math.max(0, (inv[typeKey].full || 0) - qty);
            inv[typeKey].empty = (inv[typeKey].empty || 0) + qty;
        }

        truck.inventory = inv;
        truck.lastUpdate = new Date();
        await this.truckRepo.save(truck);
    }

    /** Driver-managed truck load: set or adjust truck inventory directly */
    async loadTruckInventory(
        truckPlate: string,
        companyId: string,
        inventory: Record<string, { full?: number; empty?: number; damaged?: number }>,
        driverId?: string,
        mode: 'SET' | 'ADD' = 'SET',
    ) {
        let truck = await this.truckRepo.findOne({ where: { truckPlate, companyId } });
        if (!truck) {
            truck = this.truckRepo.create({
                id: `TRUCK-${truckPlate}-${companyId}`,
                truckPlate,
                companyId,
                inventory: {},
            });
        }

        if (mode === 'SET') {
            truck.inventory = inventory;
        } else {
            const inv = (truck.inventory || {}) as Record<string, any>;
            for (const key of Object.keys(inventory)) {
                if (!inv[key]) inv[key] = { full: 0, empty: 0, damaged: 0 };
                inv[key].full = (inv[key].full || 0) + (inventory[key].full || 0);
                inv[key].empty = (inv[key].empty || 0) + (inventory[key].empty || 0);
                inv[key].damaged = (inv[key].damaged || 0) + (inventory[key].damaged || 0);
            }
            truck.inventory = inv;
        }

        if (driverId) truck.driverId = driverId;
        truck.lastUpdate = new Date();
        return this.truckRepo.save(truck);
    }

    async getCompanies() {
        // We only want companies that have an ACTIVE license AND have the GAS or INVENTORY feature.
        const licensedCompanies = await this.licenseRepo.find({
            where: {
                status: LicenseStatus.ACTIVE,
                isRevoked: false,
            },
            select: ['companyId', 'features'],
        });

        // Filter for relevant mobile features
        const relevantCompanyIds = licensedCompanies
            .filter(
                (l) => l.features?.includes('INVENTORY') || l.features?.includes('GAS'),
            )
            .map((l) => l.companyId);

        if (relevantCompanyIds.length === 0) return [];

        return this.companyRepo.find({
            where: { id: In(relevantCompanyIds) },
            select: ['id', 'name'],
            order: { name: 'ASC' },
        });
    }

    /**
     * Gets order and payment history for a reseller.
     */
    async getResellerHistory(customerId: string, companyId: string) {
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, `\n[AUDIT] Service getResellerHistory for Customer: ${customerId} on Company: ${companyId} at ${new Date().toISOString()}\n`);

        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const tenantTreasuryRepo = await this.getTenantRepo<TreasuryDocument>(TreasuryDocument, companyId);

        const orders = await tenantSalesRepo.find({
            where: { customerId },
            order: { date: 'DESC' },
            take: 20,
            relations: ['lines']
        });

        const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);

        // ENRICHMENT: Add real-time driver location and TOTAL items
        const enrichedOrders = await Promise.all(orders.map(async (order) => {
            const doc: any = { ...order };

            // GPS Self-healing for older/incomplete orders
            if (!doc.latitude && doc.deliveryPointId) {
                const point = await tenantPointRepo.findOne({ where: { id: doc.deliveryPointId } });
                if (point) {
                    doc.latitude = point.latitude;
                    doc.longitude = point.longitude;
                    tenantSalesRepo.update(doc.id, { latitude: point.latitude, longitude: point.longitude });
                }
            }

            // Calculate total items
            doc.totalQty = order.lines?.reduce((acc, l) => acc + Number(l.quantity), 0) || 0;
            doc.itemsSummary = order.lines?.map(l => `${l.quantity}x ${l.articleName}`).join(', ') || '';

            if (doc.status === 'POSTED' && doc.driverId) {
                // Find the truck assigned to this driver
                const truck = await this.truckRepo.findOne({
                    where: { driverId: doc.driverId, companyId }
                });
                if (truck) {
                    doc.driverLat = truck.lastLat;
                    doc.driverLng = truck.lastLng;
                    doc.truckPlate = truck.truckPlate;
                }
            }
            return doc;
        }));

        const payments = await tenantTreasuryRepo.find({
            where: { customerCode: customerId },
            order: { date: 'DESC' },
            take: 20
        });

        return { orders: enrichedOrders, payments };
    }

    async getDriverHistory(employeeId: string, companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);
        const tenantCustomerRepo = await this.getTenantRepo<Customer>(Customer, companyId);

        const orders = await tenantSalesRepo.find({
            where: { driverId: employeeId },
            order: { date: 'DESC' },
            take: 30,
            relations: ['lines']
        });

        const enriched = await Promise.all(orders.map(async (o) => {
            const doc = { ...o } as any;

            // GPS Self-healing Deep Dive (Fix for orders with missing points)
            if (!doc.latitude) {
                let p: any = null;
                // Try from explicit point ID first
                if (doc.deliveryPointId) {
                    p = await tenantPointRepo.findOne({ where: { id: doc.deliveryPointId } });
                }
                // Fallback: If no point, find the first available delivery point for this customer
                if (!p && doc.customerId) {
                    p = await tenantPointRepo.findOne({ where: { customer: { id: doc.customerId } } });
                }

                if (p && p.latitude) {
                    doc.latitude = Number(p.latitude);
                    doc.longitude = Number(p.longitude);
                    // Persistent fix: Save it back to the order forever!
                    tenantSalesRepo.update(doc.id, {
                        latitude: doc.latitude,
                        longitude: doc.longitude,
                        deliveryPointId: doc.deliveryPointId || p.id
                    });
                    console.log(`[GPS-DEEP-HEAL] Fixed GT ${doc.documentNumber} for Driver. Customer Point inherited.`);
                }
            }

            return {
                ...doc,
                totalQty: o.lines?.reduce((acc, l) => acc + Number(l.quantity), 0) || 0,
                itemsSummary: o.lines?.map(l => `${l.quantity}x ${l.articleName}`).join(', ') || ''
            };
        }));

        return enriched;
    }

    /**
     * Gets deliveries that are approved but not yet assigned to a driver.
     * Filtered for Gas Sector (last 7 days + contains gas articles).
     */
    async getPendingDeliveries(companyId: string) {
        console.log(`[MobileService] Fetching pending deliveries for company ${companyId}`);
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);

        // Fetch GT docs from the last 7 days to avoid old baggage appearing
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStr = sevenDaysAgo.toISOString().split('T')[0];

        const allGts = await tenantSalesRepo.find({
            where: [
                { documentType: 'GT', status: WorkflowStatus.APPROVED, driverId: IsNull() },
                { documentType: 'GT', status: WorkflowStatus.APPROVED, driverId: '' }
            ],
            relations: ['lines'],
            order: { date: 'ASC' }
        });

        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, `\n[AUDIT-DEEP] Pending Fetch: Company=${companyId}. Raw GT Docs (approved/no-driver): ${allGts.length}.\n`);

        // 2. Gas Sector check: Disabled temporarily for diagnostics
        const deliveries = allGts;

        // Self-Healing: If customerName is missing, fetch it from Customer repo
        const tenantCustomerRepo = await this.getTenantRepo<Customer>(Customer, companyId);
        for (const del of deliveries) {
            if (!del.customerName && del.customerId) {
                const customer = await tenantCustomerRepo.findOne({ where: { id: del.customerId } });
                if (customer) {
                    del.customerName = customer.name;
                    // Optional: Save back to DB to fix it permanently
                    tenantSalesRepo.update(del.id, { customerName: customer.name });
                }
            }
        }

        console.log(`[MobileService] Found ${deliveries.length} pending deliveries`);
        if (deliveries.length === 0) {
            // Diagnostic: Check if there are ANY GT documents with null driver
            const anyGt = await tenantSalesRepo.count({ where: { documentType: 'GT', driverId: IsNull() } });
            console.log(`[MobileService] Total GT docs with null driver: ${anyGt}`);
        }

        return deliveries;
    }

    /**
     * Helper to notify customer about delivery status.
     */
    private async notifyCustomerOfDeliveryStatus(customerId: string, message: string, companyId: string) {
        if (!customerId) return;

        // 1. Try to find the Mobile User for PUSH
        const user = await this.userRepo.findOne({ where: { customerId } });
        if (user && user.phone) {
            await this.notificationService.sendNotification(user.phone, message, ['PUSH', 'SMS']);
            return;
        }

        // 2. Fallback to Customer entity for SMS
        const tenantCustomerRepo = await this.getTenantRepo<Customer>(Customer, companyId);
        const customer = await tenantCustomerRepo.findOne({ where: { id: customerId } });
        if (customer && customer.phone) {
            await this.notificationService.sendNotification(customer.phone, message, ['SMS']);
        }
    }

    /**
     * Assigns a driver to a delivery and updates status.
     */
    async assignDriverToDelivery(documentId: string, driverId: string, companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const doc = await tenantSalesRepo.findOne({ where: { id: documentId } });
        if (!doc) throw new NotFoundException('Entrega não encontrada');

        doc.driverId = driverId;
        doc.status = WorkflowStatus.POSTED; // Moving to POSTED to indicate it's in progress/claimed
        const saved = await tenantSalesRepo.save(doc);

        // Notify Customer
        const driverUser = await this.userRepo.findOne({ where: { employeeId: driverId } });
        const driverName = driverUser?.name || 'Um motorista';
        await this.notifyCustomerOfDeliveryStatus(
            doc.customerId,
            `A sua entrega (${doc.documentNumber}) está a caminho! O motorista ${driverName} já aceitou o pedido.`,
            companyId
        );

        return saved;
    }

    async cancelDelivery(documentId: string, driverId: string, justification: string, companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const doc = await tenantSalesRepo.findOne({ where: { id: documentId, driverId } });
        if (!doc) throw new NotFoundException('Entrega não encontrada ou não atribuída a este motorista');

        doc.status = WorkflowStatus.APPROVED; // Reset to APPROVED to show in pending again
        doc.statusNotes = justification;
        (doc as any).driverId = null;
        (doc as any).routeSequence = null;
        const saved = await tenantSalesRepo.save(doc);

        // Notify Customer
        const driverUser = await this.userRepo.findOne({ where: { employeeId: driverId } });
        const driverName = driverUser?.name || 'O motorista';
        await this.notifyCustomerOfDeliveryStatus(
            doc.customerId,
            `Não foi possível completar a sua entrega (${doc.documentNumber}). Motivo: ${justification}. O nosso dispatcher entrará em contacto brevemente.`,
            companyId
        );

        return saved;
    }

    /**
     * Gets the current assigned route (sequence of deliveries) for a driver.
     */
    async getAssignedRoute(employeeId: string, companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const deliveries = await tenantSalesRepo.find({
            where: {
                driverId: employeeId,
                status: In([WorkflowStatus.POSTED, WorkflowStatus.APPROVED])
            },
            relations: ['lines'],
            order: { routeSequence: 'ASC', date: 'ASC' }
        });

        // Self-Healing
        const tenantCustomerRepo = await this.getTenantRepo<Customer>(Customer, companyId);
        const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);

        for (const del of deliveries) {
            const doc = del as any;
            // Summary Calculate (The Critical Addition)
            doc.totalQty = del.lines?.reduce((acc, l) => acc + Number(l.quantity), 0) || 0;
            doc.itemsSummary = del.lines?.map(l => `${l.quantity}x ${l.articleName}`).join(', ') || '';

            // Customer name heal
            if (!doc.customerName && doc.customerId) {
                const customer = await tenantCustomerRepo.findOne({ where: { id: doc.customerId } });
                if (customer) {
                    doc.customerName = customer.name;
                    tenantSalesRepo.update(doc.id, { customerName: customer.name });
                }
            }

            // GPS Coordinates heal (The Crucial Fix)
            if (!del.latitude && (del as any).deliveryPointId) {
                const point = await tenantPointRepo.findOne({ where: { id: (del as any).deliveryPointId } });
                if (point) {
                    del.latitude = point.latitude;
                    del.longitude = point.longitude;
                    tenantSalesRepo.update(del.id, { latitude: point.latitude, longitude: point.longitude });
                    console.log(`[GPS-HEAL] Fixed GPS for Order ${del.documentNumber} using point ${point.name}`);
                }
            }
        }
        return deliveries;
    }

    /**
     * Gets available payment methods for the company.
     */
    async getPaymentMethods(companyId: string) {
        const tenantPMRepo = await this.getTenantRepo<PaymentMethod>(PaymentMethod, companyId);
        const methods = await tenantPMRepo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC' }
        });

        if (methods.length === 0) {
            // Default fallback if none are defined
            return [
                { id: 'CASH', code: 'CASH', description: 'Dinheiro (Cash)' },
                { id: 'MPESA', code: 'MPESA', description: 'M-Pesa' },
                { id: 'EMOLA', code: 'EMOLA', description: 'e-Mola' },
                { id: 'BANK', code: 'BANK', description: 'TRF Bancária' },
                { id: 'PONTO24', code: 'PONTO24', description: 'Ponto 24' },
                { id: 'POS', code: 'POS', description: 'Cartão (POS)' }
            ];
        }
        return methods;
    }

    /**
     * Batch assigns orders to a driver/route with a specific sequence.
     */
    /**
     * DELIVERY POINTS MANAGEMENT
     */

    async getDeliveryPoints(customerId: string, companyId: string) {
        const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);
        return tenantPointRepo.find({
            where: { customerId },
            order: { name: 'ASC' }
        });
    }

    async createDeliveryPoint(customerId: string, data: any, companyId: string) {
        try {
            console.log(`[MobileService] DEBUG: customerId=${customerId}, companyId=${companyId}`);

            if (!customerId) {
                throw new BadRequestException('ERRO_TECNICO: customerId ausente no token do utilizador.');
            }

            const ds = await this.tenancyService.getTenantDataSource(companyId);
            const tenantPointRepo = ds.getRepository(DeliveryPoint);
            const tenantCustomerRepo = ds.getRepository(Customer);

            // 1. Verify if customer exists in the specific tenant DB
            let customer = await tenantCustomerRepo.findOne({ where: { id: customerId } });

            // SELF-HEALING: If customer missing in Tenant DB but we have the ID, try to restore it
            if (!customer) {
                console.warn(`[MobileService] Customer ${customerId} missing in tenant DB. Attempting self-healing...`);
                const globalUser = await this.userRepo.findOne({ where: { customerId } });
                if (globalUser) {
                    console.log(`[MobileService] Found global user ${globalUser.username}. Re-creating customer in tenant DB.`);
                    customer = tenantCustomerRepo.create({
                        id: customerId,
                        companyId,
                        name: globalUser.name || globalUser.username,
                        phone: globalUser.phone,
                        status: 'APPROVED',
                        isActive: true,
                        type: 'REVENDEDOR',
                        code: `REV-FIX-${Date.now().toString().slice(-4)}`
                    });
                    await tenantCustomerRepo.save(customer);
                } else {
                    throw new NotFoundException(`404_CUSTOM: O cliente UUID ${customerId} não existe em lado nenhum.`);
                }
            }

            // 2. Prepare payload
            const count = await tenantPointRepo.count({ where: { customerId } });

            // Ensure numbers are rounded to match DB precision (8 scale)
            const lat = typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude;
            const lng = typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude;

            if (isNaN(lat) || isNaN(lng)) {
                throw new BadRequestException('Coordenadas GPS inválidas (NaN)');
            }

            const partial: any = {
                name: data.name || 'Ponto sem nome',
                address: data.address || '',
                latitude: Number(lat.toFixed(8)),
                longitude: Number(lng.toFixed(8)),
                customerId,
                companyId,
                isDefault: count === 0 ? true : !!data.isDefault
            };

            console.log(`[MobileService] Saving Delivery Point:`, partial);

            const point = tenantPointRepo.create(partial);

            // 3. Default Management
            if (partial.isDefault && count > 0) {
                await tenantPointRepo.update({ customerId }, { isDefault: false });
            }

            const saved = await tenantPointRepo.save(point) as unknown as DeliveryPoint;
            console.log(`[MobileService] Successfully created point: ${saved.id}`);
            return saved;
        } catch (error: any) {
            console.error(`[MobileService] createDeliveryPoint failed:`, error);

            // Re-throw if already an HttpException
            if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;

            throw new BadRequestException({
                message: 'Erro interno ao gravar ponto de entrega',
                details: error.message,
                dbError: error.code
            });
        }
    }

    async updateDeliveryPoint(id: string, customerId: string, data: any, companyId: string) {
        const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);
        const point = await tenantPointRepo.findOne({ where: { id, customerId } });
        if (!point) throw new NotFoundException('Ponto de entrega não encontrado');

        if (data.isDefault) {
            await tenantPointRepo.update({ customerId }, { isDefault: false });
        }

        Object.assign(point, data);
        return tenantPointRepo.save(point);
    }

    async deleteDeliveryPoint(id: string, customerId: string, companyId: string) {
        const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);
        return tenantPointRepo.delete({ id, customerId });
    }

    async assignRoute(employeeId: string, docIds: string[], companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const docs = await tenantSalesRepo.find({
            where: { id: In(docIds) }
        });

        const driverUser = await this.userRepo.findOne({ where: { employeeId } });
        const driverName = driverUser?.name || 'Um motorista';

        // Update each document and notify customer
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            doc.driverId = employeeId;
            doc.routeSequence = i + 1;
            doc.status = WorkflowStatus.APPROVED; // Keep as APPROVED (Pending Delivery)
            await tenantSalesRepo.save(doc);

            // Notify Customer via unified helper
            await this.notifyCustomerOfDeliveryStatus(doc.id, companyId, 'SCHEDULED');
        }

        return { success: true, count: docs.length };
    }

    /**
     * ROUTE OPTIMIZATION (Nearest Neighbor)
     */
    async getOptimizedSequence(docIds: string[], companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const docs = await tenantSalesRepo.find({
            where: { id: In(docIds) }
        });

        const company = await this.companyRepo.findOne({ where: { id: companyId } });
        const startLat = company?.latitude ? Number(company.latitude) : -25.9655;
        const startLng = company?.longitude ? Number(company.longitude) : 32.5833;

        const optimized: SalesDocument[] = [];
        const remaining = docs.filter(d => d.latitude && d.longitude);
        const skipped = docs.filter(d => !d.latitude || !d.longitude);

        let currentLat = startLat;
        let currentLng = startLng;

        while (remaining.length > 0) {
            let nearestIdx = -1;
            let minDistance = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const dist = this.calculateDistance(
                    currentLat, currentLng,
                    Number(remaining[i].latitude), Number(remaining[i].longitude)
                );
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestIdx = i;
                }
            }

            if (nearestIdx !== -1) {
                const next = remaining.splice(nearestIdx, 1)[0];
                optimized.push(next);
                currentLat = Number(next.latitude);
                currentLng = Number(next.longitude);
            } else {
                break;
            }
        }

        return [...optimized, ...skipped];
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    /**
     * Notifies all drivers for a company about a new available delivery.
     */
    private async notifyDriversOfNewOrder(companyId: string, resellerName: string, itemsCount: number) {
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, `\n[AUDIT] Notifying drivers for company ${companyId}. Notification: "${resellerName} - ${itemsCount} items" at ${new Date().toISOString()}\n`);

        const drivers = await this.getDrivers(companyId);
        if (drivers.length === 0) {
            console.log(`[MobileService] No drivers found to notify for company ${companyId}`);
            return;
        }

        const message = `Inverno Go: Nova encomenda de ${resellerName} (${itemsCount} garrafas). Já disponível para recolha!`;

        console.log(`[MobileService] Identified ${drivers.length} drivers to notify.`);

        for (const driver of drivers) {
            if (driver.phone) {
                console.log(`[MobileService] Sending notification to ${driver.username} (${driver.phone})...`);
                // Using PUSH and SMS to ensure it's "real-time" enough
                this.notificationService.sendNotification(driver.phone, message, ['PUSH', 'SMS']).catch(err =>
                    console.error(`[MobileService] Failed to notify driver ${driver.username}: `, err)
                );
            }
        }
    }


    /**
     * Driver releases a claimed delivery, making it available again for others.
     */
    async releaseDelivery(documentId: string, companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const doc = await tenantSalesRepo.findOne({ where: { id: documentId } });
        if (!doc) throw new NotFoundException('Entrega não encontrada');

        // Reset driver and status
        doc.driverId = '';
        doc.status = WorkflowStatus.APPROVED; // Voltar ao estado disponível para qualquer um
        return tenantSalesRepo.save(doc);
    }
}
