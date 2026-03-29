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
    ) { }

    private async getTenantRepo<T extends ObjectLiteral>(
        entity: any,
        companyId: string,
    ): Promise<Repository<T>> {
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(entity);
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
        return this.userRepo.find({
            where: [
                { status: 'PENDING', userType: 'MOBILE' },
                { status: 'PENDING', profile: 'RESELLER' },
                { status: 'PENDING', profile: 'DRIVER' },
            ],
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Gets all approved mobile users for historical lookups.
     */
    async getApprovedUsers() {
        return this.userRepo.find({
            where: { status: 'APPROVED', userType: 'MOBILE' },
            relations: ['company'],
            order: { updatedAt: 'DESC' },
        });
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
    async getGasInventory(companyId: string): Promise<any[]> {
        console.log(`[MobileService] Fetching gas inventory for company ${companyId}`);

        // AUTO-CORRECTION: Ensure the 8 standard weights exist in the database
        try {
            await this.gasControlService.ensureStandardCylinderTypes(companyId);
        } catch (err) {
            console.error(`[MobileService] Error in auto-correction sync:`, err);
        }

        const tenantGasRepo = await this.getTenantRepo<GasCylinderType>(
            GasCylinderType,
            companyId,
        );
        const tenantArticleRepo = await this.getTenantRepo<Article>(
            Article,
            companyId,
        );

        const [types, articles] = await Promise.all([
            tenantGasRepo.find({ where: { isActive: true }, order: { name: 'ASC' } }),
            tenantArticleRepo.find({ where: { isActive: true } })
        ]);

        console.log(`[MobileService] Found ${types.length} gas types and ${articles.length} active articles`);

        // Map article IDs to types and FILTER OUT types without valid full article mapping
        const mapped = types.map(type => {
            const article = articles.find(a => a.code === type.fullArticleCode);
            if (!article) {
                console.warn(`[MobileService] Gas type ${type.name} has no matching article code ${type.fullArticleCode}`);
                return null;
            }
            return {
                ...type,
                id: article.id, // Primary ID for mobile is the Article UUID
                code: article.code,
                name: type.name || article.name,
                articleId: article.id,
                price: type.priceRevendedor || article.salePrice, // Use priceRevendedor for mobile resellers
            };
        }).filter(item => item !== null);

        console.log(`[MobileService] Returning ${mapped.length} mapped gas items`);
        return mapped;
    }

    /**
     * Registers a new mobile user.
     */
    async register(data: any, companyId: string) {
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
    async updateTruckStatus(truckPlate: string, data: any, companyId: string) {
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

    async createResellerOrder(customerId: string, data: any, companyId: string) {
        const tenantCustomerRepo = await this.getTenantRepo<Customer>(Customer, companyId);
        const customer = await tenantCustomerRepo.findOne({ where: { id: customerId } });

        return this.salesService.create({
            ...data,
            customerId,
            customerName: customer?.name || 'Cliente Mobile',
            companyId,
            isMobileSale: true,
            status: WorkflowStatus.APPROVED, // Set to APPROVED so drivers can see it immediately
            documentType: 'GT',
        });
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
        const sale = await this.salesService.create({
            ...data,
            companyId,
            status: 'POSTED',
            documentType: 'VD',
        });
        return sale;
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
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const tenantTreasuryRepo = await this.getTenantRepo<TreasuryDocument>(TreasuryDocument, companyId);

        const orders = await tenantSalesRepo.find({
            where: { customerId },
            order: { date: 'DESC' },
            take: 20
        });

        const payments = await tenantTreasuryRepo.find({
            where: { customerCode: customerId }, // In this ERP, customerId might be stored in customerCode for treasury
            order: { date: 'DESC' },
            take: 20
        });

        return { orders, payments };
    }

    /**
     * Gets history of sales and deliveries for a driver.
     */
    async getDriverHistory(employeeId: string, companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);

        return tenantSalesRepo.find({
            where: { driverId: employeeId },
            order: { date: 'DESC' },
            take: 30
        });
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

        const gasWeights = ['9KG', '48KG', '45KG', '05KG', '14KG', '19KG', '6KG', '11KG'];
        const deliveries = allGts.filter(doc => {
            // 1. Date check
            if (doc.date < dateStr) return false;

            // 2. Gas Sector check: Must contain at least one gas cylinder article
            const hasGas = doc.lines?.some(line =>
                gasWeights.some(weight => line.articleCode?.startsWith(weight))
            );
            return hasGas;
        });

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
        for (const del of deliveries) {
            if (!del.customerName && del.customerId) {
                const customer = await tenantCustomerRepo.findOne({ where: { id: del.customerId } });
                if (customer) {
                    del.customerName = customer.name;
                    tenantSalesRepo.update(del.id, { customerName: customer.name });
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
        const tenantPointRepo = await this.getTenantRepo<DeliveryPoint>(DeliveryPoint, companyId);

        // If it's the first point, make it default
        const count = await tenantPointRepo.count({ where: { customerId } });

        const partial: any = {
            ...data,
            customerId,
            companyId,
            isDefault: count === 0 ? true : !!data.isDefault
        };
        const point = tenantPointRepo.create(partial) as unknown as DeliveryPoint;

        // If this one is set as default, unset others
        if (point.isDefault && count > 0) {
            await tenantPointRepo.update({ customerId }, { isDefault: false });
        }

        return tenantPointRepo.save(point);
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
}
