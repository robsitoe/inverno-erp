import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseDocument } from './entities/purchase.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly tenancyService: TenancyService,
    @InjectRepository(PurchaseDocument)
    private readonly defaultPurchaseRepo: Repository<PurchaseDocument>,
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(companyId);
    return ds.getRepository(entity);
  }

  private async getPurchaseRepo() { return this.getRepo(PurchaseDocument, this.defaultPurchaseRepo); }

  async create(createPurchaseDto: CreatePurchaseDto) {
    const { lines, ...documentData } = createPurchaseDto;
    const repo = await this.getPurchaseRepo();

    const entityData: any = {
      ...documentData,
      type: documentData.documentType,
      number: documentData.seriesNumber,
      merchandiseTotal: documentData.subtotal || 0,
      discountValue: documentData.discounts || 0,
      taxTotal: documentData.totalIva || 0,
      totalValue: documentData.total || 0,
      lines: lines.map(line => ({
        ...line,
        id: line.id || `LINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        totalLiquid: line.subtotal || (line.quantity * line.unitPrice),
        totalValue: line.total || (line.quantity * line.unitPrice * (1 + (line.ivaRate || 0) / 100)),
        taxRate: line.ivaRate || 0,
        taxCode: line.ivaCode || 'IVA'
      }))
    };

    // Remove DTO redundant fields
    delete entityData.documentType;
    delete entityData.seriesNumber;
    delete entityData.subtotal;
    delete entityData.discounts;
    delete entityData.totalIva;
    delete entityData.total;

    if (!entityData.id) {
      entityData.id = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (!entityData.number) {
        const lastDoc = await repo.findOne({
          where: {
            type: entityData.type,
            series: entityData.series,
            companyId: entityData.companyId
          },
          order: { number: 'DESC' } as any,
        });
        entityData.number = (lastDoc?.number || 0) + 1;
      }

      if (!entityData.documentNumber || entityData.documentNumber.includes('undefined')) {
        entityData.documentNumber = `${entityData.type} ${entityData.series}/${entityData.number}`;
      }
    }

    const purchase = repo.create(entityData);
    return repo.save(purchase);
  }

  async findAll(companyId?: string) {
    const repo = await this.getPurchaseRepo();
    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }
    return repo.find({ where, relations: ['lines'] });
  }

  async findOne(id: string) {
    const repo = await this.getPurchaseRepo();
    return repo.findOne({ where: { id }, relations: ['lines'] });
  }

  async update(id: string, updatePurchaseDto: UpdatePurchaseDto) {
    const repo = await this.getPurchaseRepo();
    return repo.update(id, updatePurchaseDto);
  }

  async findByNumber(companyId: string, type: string, series: string, number: number) {
    const repo = await this.getPurchaseRepo();
    return repo.findOne({
      where: {
        companyId,
        type,
        series,
        number
      },
      relations: ['lines']
    });
  }

  async remove(id: string) {
    const repo = await this.getPurchaseRepo();
    return repo.delete(id);
  }
}
