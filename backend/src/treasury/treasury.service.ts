import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { TreasuryDocument, TreasuryDocumentType } from './entities/treasury.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';

@Injectable()
export class TreasuryService {
  constructor(
    private readonly tenancyService: TenancyService,
    @InjectRepository(TreasuryDocument)
    private readonly defaultTreasuryRepo: Repository<TreasuryDocument>,
    @InjectRepository(PaymentMethod)
    private readonly defaultPaymentMethodRepo: Repository<PaymentMethod>,
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(companyId);
    return ds.getRepository(entity);
  }

  private async getTreasuryRepo() { return this.getRepo(TreasuryDocument, this.defaultTreasuryRepo); }
  private async getPaymentMethodRepo() { return this.getRepo(PaymentMethod, this.defaultPaymentMethodRepo); }

  async create(createTreasuryDto: CreateTreasuryDto) {
    const repo = await this.getTreasuryRepo();
    const treasury = repo.create(createTreasuryDto);
    return repo.save(treasury);
  }

  async findAll(companyId?: string) {
    const repo = await this.getTreasuryRepo();
    if (companyId) {
      return repo.find({
        where: { companyId },
        relations: ['lines']
      });
    }
    return repo.find({ relations: ['lines'] });
  }


  async findOne(id: string) {
    const repo = await this.getTreasuryRepo();
    const doc = await repo.findOne({ where: { id }, relations: ['lines'] });
    if (!doc) throw new NotFoundException('Documento de tesouraria não encontrado');
    return doc;
  }

  async update(id: string, updateTreasuryDto: UpdateTreasuryDto) {
    const repo = await this.getTreasuryRepo();
    return repo.update(id, updateTreasuryDto);
  }

  async remove(id: string) {
    const repo = await this.getTreasuryRepo();
    return repo.delete(id);
  }

  async findAllReceipts(companyId?: string) {
    const repo = await this.getTreasuryRepo();
    const where: any = { type: TreasuryDocumentType.RECEIPT };
    if (companyId) {
      where.companyId = companyId;
    }
    return repo.find({
      where,
      relations: ['lines']
    });
  }


  async createReceipt(data: any) {
    const repo = await this.getTreasuryRepo();
    const receipt = repo.create({ ...data, type: TreasuryDocumentType.RECEIPT });
    return repo.save(receipt);
  }

  async findAllPayments(companyId?: string) {
    const repo = await this.getTreasuryRepo();
    const where: any = { type: TreasuryDocumentType.PAYMENT };
    if (companyId) {
      where.companyId = companyId;
    }
    return repo.find({
      where,
      relations: ['lines']
    });
  }


  async createPayment(data: any) {
    const repo = await this.getTreasuryRepo();
    const payment = repo.create({ ...data, type: TreasuryDocumentType.PAYMENT });
    return repo.save(payment);
  }

  // Payment Methods
  async savePaymentMethod(data: Partial<PaymentMethod>) {
    const repo = await this.getPaymentMethodRepo();
    return repo.save(data);
  }

  async findAllPaymentMethods(companyId?: string) {
    const repo = await this.getPaymentMethodRepo();
    if (companyId) {
      return repo.find({
        where: { companyId },
        order: { sortOrder: 'ASC' }
      });
    }
    return repo.find({ order: { sortOrder: 'ASC' } });
  }

  async removePaymentMethod(id: string) {
    const repo = await this.getPaymentMethodRepo();
    return repo.delete(id);
  }
}
