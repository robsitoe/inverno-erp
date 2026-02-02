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

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    private readonly tenancyService: TenancyService
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return this.dataSource.getRepository(entity);

    const ds = await this.tenancyService.getTenantDataSource(companyId);
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
    return await this.dataSource.getRepository(Company).save(company);
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
    const repo = await this.getRepo(FiscalYear);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    if (filterCompanyId) {
      return await repo.find({ where: { companyId: filterCompanyId }, order: { year: 'DESC' } });
    }
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

  // --- Series Endpoints ---
  @Get('series')
  async getSeries(@Query('companyId') companyId: string) {
    const repo = await this.getRepo(Series);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    if (filterCompanyId) {
      return await repo.find({ where: { companyId: filterCompanyId }, order: { code: 'DESC' } });
    }
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
    const repo = await this.getRepo(Journal);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    if (filterCompanyId) {
      return await repo.find({ where: { companyId: filterCompanyId }, order: { code: 'ASC' } });
    }
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
    const repo = await this.getRepo(Customer);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    if (filterCompanyId) {
      return await repo.find({
        where: { companyId: filterCompanyId },
        order: { name: 'ASC' }
      });
    }
    return await repo.find({ order: { name: 'ASC' } });
  }


  @Post('customers')
  async saveCustomer(@Body() customer: CreateCustomerDto | CreateCustomerDto[]) {
    try {
      const repo = await this.getRepo(Customer);
      if (Array.isArray(customer)) {
        // Ensure all items have an ID if it's a primary column
        const processed = customer.map(c => ({
          ...c,
          id: c.id || `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        }));
        return await repo.save(processed);
      }
      const toSave = {
        ...customer,
        id: (customer as any).id || `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      return await repo.save(toSave);
    } catch (error) {
      console.error('Error in saveCustomer:', error);
      throw new BadRequestException(`Erro ao guardar cliente: ${error.message}`);
    }
  }

  // --- Suppliers Endpoints ---
  @Get('suppliers')
  async getSuppliers(@Query('companyId') companyId?: string) {
    const repo = await this.getRepo(Supplier);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    if (filterCompanyId) {
      return await repo.find({
        where: { companyId: filterCompanyId },
        order: { name: 'ASC' }
      });
    }
    return await repo.find({ order: { name: 'ASC' } });
  }


  @Post('suppliers')
  async saveSupplier(@Body() supplier: CreateSupplierDto | CreateSupplierDto[]) {
    try {
      const repo = await this.getRepo(Supplier);
      if (Array.isArray(supplier)) {
        const processed = supplier.map(s => ({
          ...s,
          id: s.id || `SUPP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        }));
        return await repo.save(processed);
      }
      const toSave = {
        ...supplier,
        id: (supplier as any).id || `SUPP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      return await repo.save(toSave);
    } catch (error) {
      console.error('Error in saveSupplier:', error);
      throw new BadRequestException(`Erro ao guardar fornecedor: ${error.message}`);
    }
  }

  // --- Generic Entities Endpoints ---
  @Get('entities')
  async getGenericEntities(@Query('type') type: string) {
    const repo = await this.getRepo(GenericEntity);
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
            entities: [Account, JournalEntry, Article, StockMovement, SalesDocument, PurchaseDocument, TreasuryDocument, Company, FiscalYear, Journal, Customer, Supplier, User, GenericEntity],
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
    const repo = await this.getRepo(DocumentType);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    const where: any = { module };
    if (filterCompanyId) {
      where.companyId = filterCompanyId;
    }
    return await repo.find({ where, order: { code: 'ASC' } as any });
  }

  @Post('document-types')
  async saveDocumentTypes(@Body() data: { module: string, types: any[] }) {
    const repo = await this.getRepo(DocumentType);
    const companyId = TenancyContext.getCompanyId();

    // We expect an array of types for a specific module
    const processed = data.types.map(t => ({
      ...t,
      module: data.module,
      companyId: t.companyId || companyId,
      id: t.id || `${data.module}-${t.code}-${companyId || 'GLOBAL'}`
    }));

    return await repo.save(processed);
  }

  // --- Payment Methods Endpoints ---
  @Get('payment-methods')
  async getPaymentMethods(@Query('companyId') companyId?: string) {
    const repo = await this.getRepo(PaymentMethod);
    const filterCompanyId = companyId || TenancyContext.getCompanyId();
    if (filterCompanyId) {
      return await repo.find({
        where: [{ companyId: filterCompanyId }, { companyId: IsNull() }],
        order: { sortOrder: 'ASC' }
      });
    }
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (data.companies && data.companies.length > 0) await queryRunner.manager.save(Company, data.companies);
      else if (data.companyInfo) await queryRunner.manager.save(Company, data.companyInfo);

      if (data.fiscalYears && data.fiscalYears.length > 0) await queryRunner.manager.save(FiscalYear, data.fiscalYears);
      if (data.articles && data.articles.length > 0) await queryRunner.manager.save(Article, data.articles);
      if (data.accounts && data.accounts.length > 0) await queryRunner.manager.save(Account, data.accounts);
      if (data.journals && data.journals.length > 0) await queryRunner.manager.save(Journal, data.journals);
      if (data.salesDocuments && data.salesDocuments.length > 0) await queryRunner.manager.save(SalesDocument, data.salesDocuments);
      if (data.purchaseDocuments && data.purchaseDocuments.length > 0) await queryRunner.manager.save(PurchaseDocument, data.purchaseDocuments);
      if (data.journalEntries && data.journalEntries.length > 0) await queryRunner.manager.save(JournalEntry, data.journalEntries);
      if (data.stockMovements && data.stockMovements.length > 0) await queryRunner.manager.save(StockMovement, data.stockMovements);
      if (data.receipts && data.receipts.length > 0) await queryRunner.manager.save(TreasuryDocument, data.receipts);
      if (data.payments && data.payments.length > 0) await queryRunner.manager.save(TreasuryDocument, data.payments);
      if (data.customers && data.customers.length > 0) await queryRunner.manager.save(Customer, data.customers);
      if (data.suppliers && data.suppliers.length > 0) await queryRunner.manager.save(Supplier, data.suppliers);
      if (data.genericEntities && data.genericEntities.length > 0) await queryRunner.manager.save(GenericEntity, data.genericEntities);

      if (data.users && data.users.length > 0) {
        for (const user of data.users) {
          if (user.password && !user.password.startsWith('$2b$')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
        await queryRunner.manager.save(User, data.users);
      }

      await queryRunner.commitTransaction();
      return { success: true, message: 'Dados sincronizados com sucesso!' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Sync error:', err);
      throw new BadRequestException('Erro ao sincronizar dados: ' + err.message);
    } finally {
      await queryRunner.release();
    }
  }
}
