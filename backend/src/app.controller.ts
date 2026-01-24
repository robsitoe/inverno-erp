import { Controller, Get, Post, Body, BadRequestException, Query, Delete, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { Account } from './accounting/entities/account.entity';
import { JournalEntry } from './accounting/entities/journal-entry.entity';
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
import * as bcrypt from 'bcrypt';
import { CreateJournalDto } from './accounting/dto/create-journal.dto';
import { CreateCustomerDto } from './customers/dto/create-customer.dto';
import { CreateSupplierDto } from './suppliers/dto/create-supplier.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- Companies Endpoints ---
  @Get('companies')
  async getCompanies() {
    return await this.dataSource.getRepository(Company).find();
  }

  @Get('company')
  async getCompanyInfo() {
    // Return the first company as default for now, or handle by ID if needed
    const companies = await this.dataSource.getRepository(Company).find();
    return companies[0] || {
      name: 'Minha Empresa, Lda.',
      nif: '123456789',
      address: 'Maputo, Moçambique',
      email: 'info@empresa.com',
      phone: '+258 84 000 0000',
      website: ''
    };
  }

  @Post('company')
  async saveCompanyInfo(@Body() data: any) {
    return await this.dataSource.getRepository(Company).save(data);
  }

  @Delete('companies/:id')
  async deleteCompany(@Param('id') id: string) {
    return await this.dataSource.getRepository(Company).delete(id);
  }

  // --- Fiscal Years Endpoints ---
  @Get('fiscal-years')
  async getFiscalYears(@Query('companyId') companyId: string) {
    const repo = this.dataSource.getRepository(FiscalYear);
    if (companyId) {
      return await repo.find({ where: { companyId }, order: { year: 'DESC' } });
    }
    return await repo.find({ order: { year: 'DESC' } });
  }

  @Post('fiscal-years')
  async saveFiscalYear(@Body() year: any) {
    if (!year.id) {
      year.id = `${year.year}-${year.companyId}`;
    }
    return await this.dataSource.getRepository(FiscalYear).save(year);
  }

  @Post('fiscal-years/set-current')
  async setCurrentYear(@Body() data: { year: number, companyId: string }) {
    const repo = this.dataSource.getRepository(FiscalYear);
    await repo.update({ companyId: data.companyId }, { isCurrent: false });
    await repo.update({ companyId: data.companyId, year: data.year }, { isCurrent: true });
    return { success: true };
  }

  // --- Series Endpoints ---
  @Get('series')
  async getSeries(@Query('companyId') companyId: string) {
    const repo = this.dataSource.getRepository(Series);
    if (companyId) {
      return await repo.find({ where: { companyId }, order: { code: 'DESC' } });
    }
    return await repo.find({ order: { code: 'DESC' } });
  }

  @Post('series')
  async saveSeries(@Body() series: any) {
    return await this.dataSource.getRepository(Series).save(series);
  }

  @Delete('series/:id')
  async deleteSeries(@Param('id') id: string) {
    return await this.dataSource.getRepository(Series).delete(id);
  }

  // --- Journals Endpoints ---
  @Get('accounting/journals')
  async getJournals() {
    return await this.dataSource.getRepository(Journal).find();
  }

  @Post('accounting/journals')
  async saveJournal(@Body() journal: CreateJournalDto | CreateJournalDto[]) {
    const repo = this.dataSource.getRepository(Journal);
    if (Array.isArray(journal)) {
      return await repo.save(journal);
    }
    return await repo.save(journal);
  }

  // --- Customers Endpoints ---
  @Get('customers')
  async getCustomers() {
    return await this.dataSource.getRepository(Customer).find();
  }

  @Post('customers')
  async saveCustomer(@Body() customer: CreateCustomerDto | CreateCustomerDto[]) {
    const repo = this.dataSource.getRepository(Customer);
    if (Array.isArray(customer)) {
      return await repo.save(customer);
    }
    return await repo.save(customer);
  }

  // --- Suppliers Endpoints ---
  @Get('suppliers')
  async getSuppliers() {
    return await this.dataSource.getRepository(Supplier).find();
  }

  @Post('suppliers')
  async saveSupplier(@Body() supplier: CreateSupplierDto | CreateSupplierDto[]) {
    const repo = this.dataSource.getRepository(Supplier);
    if (Array.isArray(supplier)) {
      return await repo.save(supplier);
    }
    return await repo.save(supplier);
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
            entities: [Account, JournalEntry, Article, StockMovement, SalesDocument, PurchaseDocument, TreasuryDocument, Company, FiscalYear, Journal, Customer, Supplier, User],
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

  @Post('sync/push')
  async syncPush(@Body() data: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Companies & Fiscal Years
      if (data.companies && data.companies.length > 0) {
        await queryRunner.manager.save(Company, data.companies);
      } else if (data.companyInfo) {
        await queryRunner.manager.save(Company, data.companyInfo);
      }

      if (data.fiscalYears && data.fiscalYears.length > 0) {
        await queryRunner.manager.save(FiscalYear, data.fiscalYears);
      }

      // 1. Articles
      if (data.articles && data.articles.length > 0) {
        await queryRunner.manager.save(Article, data.articles);
      }

      // 2. Accounts
      if (data.accounts && data.accounts.length > 0) {
        await queryRunner.manager.save(Account, data.accounts);
      }

      // 3. Journals
      if (data.journals && data.journals.length > 0) {
        await queryRunner.manager.save(Journal, data.journals);
      }

      // 4. Sales Documents
      if (data.salesDocuments && data.salesDocuments.length > 0) {
        await queryRunner.manager.save(SalesDocument, data.salesDocuments);
      }

      // 5. Purchase Documents
      if (data.purchaseDocuments && data.purchaseDocuments.length > 0) {
        await queryRunner.manager.save(PurchaseDocument, data.purchaseDocuments);
      }

      // 6. Journal Entries
      if (data.journalEntries && data.journalEntries.length > 0) {
        await queryRunner.manager.save(JournalEntry, data.journalEntries);
      }

      // 7. Stock Movements
      if (data.stockMovements && data.stockMovements.length > 0) {
        await queryRunner.manager.save(StockMovement, data.stockMovements);
      }

      // 8. Treasury Documents
      if (data.receipts && data.receipts.length > 0) {
        await queryRunner.manager.save(TreasuryDocument, data.receipts);
      }
      if (data.payments && data.payments.length > 0) {
        await queryRunner.manager.save(TreasuryDocument, data.payments);
      }

      // 9. Customers
      if (data.customers && data.customers.length > 0) {
        await queryRunner.manager.save(Customer, data.customers);
      }

      // 10. Suppliers
      if (data.suppliers && data.suppliers.length > 0) {
        await queryRunner.manager.save(Supplier, data.suppliers);
      }

      // 11. Users
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
