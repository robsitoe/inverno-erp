import { Controller, Get, Post, Body, BadRequestException, Query, Delete, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource, IsNull, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { Account } from './accounting/entities/account.entity';
import { JournalEntry, JournalLine } from './accounting/entities/journal-entry.entity';
import { Article } from './inventory/entities/article.entity';
import { StockMovement } from './inventory/entities/stock-movement.entity';
import { SalesDocument } from './sales/entities/sales-document.entity';
import { PurchaseDocument } from './purchases/entities/purchase.entity';
import { TreasuryDocument } from './treasury/entities/treasury.entity';
import { Company } from './companies/entities/company.entity';
import { Series } from './companies/entities/series.entity';
import { FiscalYear } from './companies/entities/fiscal-year.entity';
import { Journal } from './accounting/entities/journal.entity';
import { Customer } from './customers/entities/customer.entity';
import { DeliveryPoint } from './customers/entities/delivery-point.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { User } from './users/entities/user.entity';
import { GenericEntity } from './common-entities/generic-entity.entity';
import { DocumentType } from './common-entities/entities/document-type.entity';
import { PaymentMethod } from './treasury/entities/payment-method.entity';
import * as bcrypt from 'bcrypt';
import { CreateJournalDto } from './accounting/dto/create-journal.dto';
import { CreateCustomerDto } from './customers/dto/create-customer.dto';
import { CreateSupplierDto } from './suppliers/dto/create-supplier.dto';
import { TenancyService } from './tenancy/tenancy.service';
import { TenancyContext } from './tenancy/tenancy.context';
import { PeriodControlService } from './periods/period-control.service';
import { PeriodAuditLog } from './companies/entities/period-audit-log.entity';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    private readonly tenancyService: TenancyService,
    private readonly periodControlService: PeriodControlService
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, companyId?: string): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return this.dataSource.getRepository(entity);

    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  @Get('test-route')
  testRoute() {
    return { status: 'ok', message: 'Backend is reachable' };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- Companies Endpoints ---
  @Get('companies')
  async getCompanies() {
    // Companies always in main database
    return await this.dataSource.getRepository(Company).find({ order: { name: 'ASC' } });
  }

  @Get('company')
  async getCompanyInfo() {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) {
      // Fallback or error
      return this.dataSource.getRepository(Company).findOne({ where: {} });
    }
    return await this.dataSource.getRepository(Company).findOne({ where: { id: companyId } });
  }

  @Post('company')
  async saveCompany(@Body() company: any) {
    try {
      const repo = this.dataSource.getRepository(Company);

      // 1. Check for duplicates (Name and NIF) if creating a new company
      // or if changing these values in an existing one.
      const isNew = !company.id || !(await repo.findOne({ where: { id: company.id } }));

      if (isNew) {
        const existingName = await repo.findOne({ where: { name: company.name } });
        if (existingName) {
          throw new BadRequestException(`Já existe uma empresa registrada com o nome "${company.name}".`);
        }

        if (company.nif) {
          const existingNif = await repo.findOne({ where: { nif: company.nif } });
          if (existingNif) {
            throw new BadRequestException(`O NIF "${company.nif}" já está associado a outra empresa.`);
          }
        }
      }

      // 2. Save company info in main DB
      const savedCompany = await repo.save(company);

      // 3. Always trigger tenant DB initialization check.
      try {
        await this.tenancyService.getTenantDataSource(savedCompany.id);
      } catch (tenancyError) {
        console.error(`[Tenancy Error] Failed to initialize DB for ${savedCompany.name}:`, tenancyError.message);
      }

      return savedCompany;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      console.error('Error saving company:', err);
      throw new BadRequestException(err.message || 'Erro interno ao gravar empresa.');
    }
  }




  @Delete('companies/:id')
  async deleteCompany(@Param('id') id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log(`🗑️ Starting full cleanup for company ID: ${id}`);

      // For deletion, if it's a multi-tenant setup, DROP DATABASE might be better,
      // but here we clear all rows if shared, or we just remove company record if isolated.

      // Cleanup user permissions related to this company
      const users = await queryRunner.manager.find(User);
      for (const user of users) {
        if (user.permissions && Array.isArray(user.permissions)) {
          const originalCount = user.permissions.length;
          user.permissions = user.permissions.filter((p: any) => p.companyId !== id);
          if (user.permissions.length !== originalCount) {
            await queryRunner.manager.save(User, user);
          }
        }
      }

      // Cleanup company-specific data in MAIN db (if any remains)
      await queryRunner.manager.delete(FiscalYear, { companyId: id });
      await queryRunner.manager.delete(PeriodAuditLog, { companyId: id });
      await queryRunner.manager.delete(Series, { companyId: id });
      await queryRunner.manager.delete(Journal, { companyId: id });
      await queryRunner.manager.delete(Customer, { companyId: id });
      await queryRunner.manager.delete(Supplier, { companyId: id });

      // Finally delete the company itself
      const deleteResult = await queryRunner.manager.delete(Company, id);

      await queryRunner.commitTransaction();
      console.log(`✅ Company ${id} and all related data removed.`);
      return { success: true, message: 'Empresa removida com sucesso!', result: deleteResult };
    } catch (err) {
      console.error(`❌ Error deleting company ${id}:`, err);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Erro ao remover empresa: ' + err.message);
    } finally {
      await queryRunner.release();
    }
  }

  // --- Fiscal Years Endpoints ---
  @Get('fiscal-years')
  async getFiscalYears(@Query('companyId') companyId: string) {
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(FiscalYear, filterCompanyId);
    return await repo.find({ order: { year: 'DESC' } });
  }

  @Post('fiscal-years')
  async saveFiscalYear(@Body() year: any) {
    const repo = await this.getRepo(FiscalYear);
    if (!year.id) {
      year.id = `${year.year}-${year.companyId}`;
    }
    return await repo.save(year);
  }

  @Post('fiscal-years/set-current')
  async setCurrentYear(@Body() data: { year: number, companyId: string }) {
    const repo = await this.getRepo(FiscalYear);
    await repo.update({ companyId: data.companyId }, { isCurrent: false });
    await repo.update({ companyId: data.companyId, year: data.year }, { isCurrent: true });
    return { success: true };
  }


  @Get('fiscal-years/:id/checklist')
  async getFiscalYearChecklist(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.periodControlService.getClosureChecklist(id, companyId);
  }

  @Post('fiscal-years/:id/close')
  async closeFiscalYear(
    @Param('id') id: string,
    @Body() body: { reason: string; userId?: string; username?: string; companyId?: string },
  ) {
    return this.periodControlService.closeFiscalYear(id, body?.reason, { id: body?.userId, username: body?.username }, body?.companyId);
  }

  @Post('fiscal-years/:id/reopen')
  async reopenFiscalYear(
    @Param('id') id: string,
    @Body() body: { reason: string; userId: string; username?: string; companyId?: string },
  ) {
    return this.periodControlService.reopenFiscalYear(
      id,
      body?.reason,
      { userId: body?.userId, username: body?.username, requireElevatedPermission: true },
      body?.companyId,
    );
  }

  @Get('fiscal-years/:id/audit-logs')
  async getFiscalYearAuditLogs(@Param('id') id: string, @Query('companyId') companyId?: string) {
    const repo = await this.getRepo(PeriodAuditLog);
    const resolvedCompanyId = companyId || TenancyContext.getCompanyId();
    return repo.find({
      where: { fiscalYearId: id, companyId: resolvedCompanyId },
      order: { createdAt: 'DESC' },
    });
  }

  // --- Series Endpoints ---
  @Get('series')
  async getSeries(@Query('companyId') companyId: string) {
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(Series, filterCompanyId);
    return await repo.find({ order: { code: 'DESC' } });
  }

  @Post('series')
  async saveSeries(@Body() series: any) {
    const repo = await this.getRepo(Series);
    return await repo.save(series);
  }

  @Delete('series/:id')
  async deleteSeries(@Param('id') id: string) {
    const repo = await this.getRepo(Series);
    return await repo.delete(id);
  }

  // --- Journals Endpoints ---
  @Get('accounting/journals')
  async getJournals(@Query('companyId') companyId?: string) {
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(Journal, filterCompanyId);
    return await repo.find({ order: { code: 'ASC' } });
  }


  @Post('accounting/journals')
  async saveJournal(@Body() journal: CreateJournalDto | CreateJournalDto[]) {
    const repo = await this.getRepo(Journal);
    return await repo.save(journal as any);
  }

  // --- Customers Endpoints ---
  @Get('customers')
  async getCustomers(@Query('companyId') companyId?: string) {
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(Customer, filterCompanyId);
    return await repo.find({ order: { name: 'ASC' } });
  }


  @Post('customers')
  async saveCustomer(@Body() customer: CreateCustomerDto | CreateCustomerDto[]) {
    try {
      // Determine companyId from payload if possible
      let companyId: string | undefined;
      const first = Array.isArray(customer) ? customer[0] : customer;
      if (first && (first as any).companyId) {
        companyId = (first as any).companyId;
      }

      const repo = await this.getRepo(Customer, companyId);

      const sanitizeId = (id: string | any) => {
        // If it looks like a temporary frontend ID (NEW_...) or is not a valid UUID string, remove it
        if (typeof id === 'string' && (id.startsWith('NEW_') || id.length < 30)) {
          return undefined;
        }
        return id;
      };

      if (Array.isArray(customer)) {
        const processed = customer.map(c => ({
          ...c,
          id: sanitizeId(c.id)
        }));
        return await repo.save(processed);
      }

      const toSave = {
        ...customer,
        id: sanitizeId((customer as any).id)
      };
      return await repo.save(toSave);
    } catch (error) {
      console.error('Error in saveCustomer:', error);
      throw new BadRequestException(`Erro ao guardar cliente: ${error.message}`);
    }
  }

  @Get('delivery-points')
  async getDeliveryPoints(@Query('customerId') customerId: string, @Query('companyId') companyId?: string) {
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(DeliveryPoint, filterCompanyId);
    if (customerId) {
      return await repo.find({ where: { customer: { id: customerId } }, order: { name: 'ASC' } });
    }
    return await repo.find({ order: { name: 'ASC' } });
  }

  @Post('delivery-points')
  async saveDeliveryPoint(@Body() point: any) {
    const companyId = point.companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(DeliveryPoint, companyId);
    return await repo.save(point);
  }

  @Delete('delivery-points/:id')
  async deleteDeliveryPoint(@Param('id') id: string) {
    const repo = await this.getRepo(DeliveryPoint);
    return await repo.delete(id);
  }

  // --- Suppliers Endpoints ---
  @Get('suppliers')
  async getSuppliers(@Query('companyId') companyId?: string) {
    const repo = await this.getRepo(Supplier);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    // Re-get repo with correct context just in case, though logically getRepo(Supplier) might have used context? 
    // Actually, following getCustomers pattern:
    const properRepo = await this.getRepo(Supplier, filterCompanyId);
    return await properRepo.find({ order: { name: 'ASC' } });
  }


  @Post('suppliers')
  async saveSupplier(@Body() supplier: CreateSupplierDto | CreateSupplierDto[]) {
    try {
      // Determine companyId from payload if possible
      let companyId: string | undefined;
      const first = Array.isArray(supplier) ? supplier[0] : supplier;
      if (first && (first as any).companyId) {
        companyId = (first as any).companyId;
      }

      const repo = await this.getRepo(Supplier, companyId);

      const sanitizeId = (id: string | any) => {
        // If it looks like a temporary frontend ID (NEW_...) or is not a valid UUID string, remove it
        if (typeof id === 'string' && (id.startsWith('NEW_') || id.length < 30)) {
          return undefined;
        }
        return id;
      };

      if (Array.isArray(supplier)) {
        const processed = supplier.map(s => ({
          ...s,
          id: sanitizeId(s.id)
        }));
        return await repo.save(processed);
      }

      const toSave = {
        ...supplier,
        id: sanitizeId((supplier as any).id)
      };
      return await repo.save(toSave);
    } catch (error) {
      console.error('Error in saveSupplier:', error);
      throw new BadRequestException(`Erro ao guardar fornecedor: ${error.message}`);
    }
  }

  // --- Generic Entities Endpoints ---
  @Get('entities')
  async getGenericEntities(@Query('type') type: string, @Query('companyId') companyId?: string) {
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(GenericEntity, filterCompanyId);
    if (type) {
      return await repo.find({ where: { type }, order: { name: 'ASC' } });
    }
    return await repo.find({ order: { name: 'ASC' } });
  }

  @Post('entities')
  async saveGenericEntity(@Body() entity: any) {
    return await this.dataSource.getRepository(GenericEntity).save(entity);
  }

  @Post('test-db-connection')
  async testDbConnection(@Body() config: any) {
    if (!config || !config.host || !config.username || !config.database) {
      throw new BadRequestException('Configuração de base de dados incompleta.');
    }

    const tempDataSource = new DataSource({
      type: 'postgres',
      host: config.host,
      port: parseInt(config.port) || 5432,
      username: config.username,
      password: config.password,
      database: config.database,
      synchronize: false,
    });

    try {
      await tempDataSource.initialize();
      await tempDataSource.destroy();
      return { success: true, message: 'Conexão estabelecida com sucesso!' };
    } catch (error: any) {
      if (error.code === '3D000') {
        try {
          const adminDataSource = new DataSource({
            type: 'postgres',
            host: config.host,
            port: parseInt(config.port) || 5432,
            username: config.username,
            password: config.password,
            database: 'postgres',
            synchronize: false,
          });

          await adminDataSource.initialize();
          const dbName = config.database.replace(/[^a-zA-Z0-9_-]/g, '');
          await adminDataSource.query(`CREATE DATABASE "${dbName}"`);
          await adminDataSource.destroy();

          const newDbDataSource = new DataSource({
            type: 'postgres',
            host: config.host,
            port: parseInt(config.port) || 5432,
            username: config.username,
            password: config.password,
            database: dbName,
            entities: [Account, JournalEntry, Article, StockMovement, SalesDocument, PurchaseDocument, TreasuryDocument, Company, FiscalYear, Journal, Customer, Supplier, User, GenericEntity, PeriodAuditLog],
            synchronize: true,
          });

          await newDbDataSource.initialize();
          await newDbDataSource.destroy();

          return {
            success: true,
            message: `Base de dados "${dbName}" não existia e foi criada com sucesso! Conexão estabelecida.`
          };

        } catch (creationError: any) {
          return {
            success: false,
            message: 'A base de dados não existia e falhou ao tentar criar: ' + (creationError.message || 'Erro desconhecido')
          };
        }
      }

      return {
        success: false,
        message: 'Falha na conexão: ' + (error.message || 'Erro desconhecido')
      };
    }
  }

  // --- Document Types Endpoints ---
  @Get('document-types')
  async getDocumentTypes(@Query('module') module: string, @Query('companyId') companyId?: string) {
    let filterCompanyId = companyId || TenancyContext.getCompanyId();
    try {
      const repo = await this.getRepo(DocumentType, filterCompanyId);

      // Normalize module name and handle both singular/plural
      const normalized = module ? module.toUpperCase() : '';
      const moduleQueries = [normalized];
      if (normalized === 'PURCHASE') moduleQueries.push('PURCHASES');
      if (normalized === 'PURCHASES') moduleQueries.push('PURCHASE');
      if (normalized === 'SALE') moduleQueries.push('SALES');
      if (normalized === 'SALES') moduleQueries.push('SALE');
      if (normalized === 'STOCK') moduleQueries.push('INVENTORY');
      if (normalized === 'INVENTORY') moduleQueries.push('STOCK');

      const records = await repo.find({
        where: moduleQueries.map(m => ({ module: m })),
        order: { code: 'ASC' } as any
      });

      // Remove duplicates by code (preventing SALE vs SALES overlaps)
      const uniqueRecords: any[] = [];
      const seenCodes = new Set();
      for (const record of records) {
        if (!seenCodes.has(record.code)) {
          uniqueRecords.push(record);
          seenCodes.add(record.code);
        }
      }

      return uniqueRecords.map((r: any) => {
        const { settings, ...core } = r;
        return {
          ...core,
          ...(settings || {})
        };
      });
    } catch (error: any) {
      console.error(`[AppController] Error in getDocumentTypes:`, error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Post('document-types')
  async saveDocumentTypes(@Body() data: { module: string, types: any[] }) {
    const repo = await this.getRepo(DocumentType);
    const companyId = TenancyContext.getCompanyId();

    // We expect an array of types for a specific module
    const processed = data.types.map(t => {
      const { id, companyId: cid, module: mod, code, name, description, nature, series, isActive, createdAt, updatedAt, ...settings } = t;
      return {
        id: id || `${data.module}-${code}-${cid || companyId || 'GLOBAL'}`,
        companyId: cid || companyId,
        module: data.module,
        code,
        name: name || description || code,
        description,
        nature,
        series: series || [],
        isActive: isActive !== false,
        settings // Pack everything else into the settings JSON column
      };
    });

    return await repo.save(processed);
  }

  // --- Payment Methods Endpoints ---
  @Get('payment-methods')
  async getPaymentMethods(@Query('companyId') companyId?: string) {
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(PaymentMethod, filterCompanyId);
    return await repo.find({ order: { sortOrder: 'ASC' } });
  }

  @Post('payment-methods')
  async savePaymentMethod(@Body() method: any) {
    const repo = await this.getRepo(PaymentMethod);
    if (!method.id) {
      method.id = `PM-${Date.now()}`;
    }
    return await repo.save(method);
  }

  @Post('sync/push')
  async syncPush(@Body() data: any) {
    // 1. Save Global Data (Companies, Users) to MAIN DB
    const mainQueryRunner = this.dataSource.createQueryRunner();
    await mainQueryRunner.connect();
    await mainQueryRunner.startTransaction();

    try {
      if (data.companies && data.companies.length > 0) await mainQueryRunner.manager.save(Company, data.companies);
      else if (data.companyInfo) await mainQueryRunner.manager.save(Company, data.companyInfo);

      if (data.users && data.users.length > 0) {
        for (const user of data.users) {
          if (user.password && !user.password.startsWith('$2b$')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
        await mainQueryRunner.manager.save(User, data.users);
      }

      await mainQueryRunner.commitTransaction();
    } catch (err) {
      await mainQueryRunner.rollbackTransaction();
      console.error('Global sync error:', err);
      throw new BadRequestException('Erro ao sincronizar dados globais: ' + err.message);
    } finally {
      await mainQueryRunner.release();
    }

    // 2. Group Tenant Data by CompanyId
    const tenantData = new Map<string, any>();

    const addToTenant = (items: any[], key: string) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach(item => {
        const cid = item.companyId;
        if (!cid) return; // Skip items without companyId
        if (!tenantData.has(cid)) tenantData.set(cid, {});
        const group = tenantData.get(cid);
        if (!group[key]) group[key] = [];
        group[key].push(item);
      });
    };

    addToTenant(data.fiscalYears, 'fiscalYears');
    addToTenant(data.periodAuditLogs, 'periodAuditLogs');
    addToTenant(data.articles, 'articles');
    addToTenant(data.accounts, 'accounts');
    addToTenant(data.journals, 'journals');
    addToTenant(data.journalEntries, 'journalEntries');
    addToTenant(data.salesDocuments, 'salesDocuments');
    addToTenant(data.purchaseDocuments, 'purchaseDocuments');
    addToTenant(data.stockMovements, 'stockMovements');
    addToTenant(data.receipts, 'receipts'); // Maps to TreasuryDocument
    addToTenant(data.payments, 'payments'); // Maps to TreasuryDocument
    addToTenant(data.customers, 'customers');
    addToTenant(data.suppliers, 'suppliers');
    addToTenant(data.genericEntities, 'genericEntities');

    // 3. Save per Tenant
    const errors: string[] = [];

    for (const [companyId, group] of tenantData.entries()) {
      try {
        // Get Tenant DataSource (or initialize it)
        const tenantDS = await this.tenancyService.getTenantDataSource(companyId);
        const qr = tenantDS.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
          if (group.fiscalYears) await qr.manager.getRepository(FiscalYear).save(group.fiscalYears);
          if (group.periodAuditLogs) await qr.manager.getRepository(PeriodAuditLog).save(group.periodAuditLogs);
          if (group.articles) await qr.manager.getRepository(Article).save(group.articles);
          if (group.accounts) await qr.manager.getRepository(Account).save(group.accounts);
          if (group.journals) await qr.manager.getRepository(Journal).save(group.journals);
          if (group.salesDocuments) await qr.manager.getRepository(SalesDocument).save(group.salesDocuments);
          if (group.purchaseDocuments) await qr.manager.getRepository(PurchaseDocument).save(group.purchaseDocuments);
          if (group.journalEntries) await qr.manager.getRepository(JournalEntry).save(group.journalEntries);
          if (group.stockMovements) await qr.manager.getRepository(StockMovement).save(group.stockMovements);

          // Receipts and Payments are both TreasuryDocument
          if (group.receipts) await qr.manager.getRepository(TreasuryDocument).save(group.receipts);
          if (group.payments) await qr.manager.getRepository(TreasuryDocument).save(group.payments);

          if (group.customers) await qr.manager.getRepository(Customer).save(group.customers);
          if (group.suppliers) await qr.manager.getRepository(Supplier).save(group.suppliers);
          if (group.genericEntities) await qr.manager.getRepository(GenericEntity).save(group.genericEntities);

          await qr.commitTransaction();
          console.log(`Synced data for company ${companyId}`);
        } catch (e) {
          await qr.rollbackTransaction();
          throw e;
        } finally {
          await qr.release();
        }
      } catch (err) {
        console.error(`Failed to sync for company ${companyId}`, err);
        errors.push(`Empresa ${companyId}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, message: 'Sincronização parcial (erros em: ' + errors.join('; ') + ')' };
    }

    return { success: true, message: 'Dados sincronizados com sucesso!' };
  }
}
