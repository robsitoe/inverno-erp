import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseDocument } from './entities/purchase.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseDocument)
    private purchaseRepository: Repository<PurchaseDocument>,
  ) { }

  async create(createPurchaseDto: CreatePurchaseDto) {
    const { lines, ...documentData } = createPurchaseDto;

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
        const lastDoc = await this.purchaseRepository.findOne({
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

    const purchase = this.purchaseRepository.create(entityData);
    return this.purchaseRepository.save(purchase);
  }

  findAll(companyId?: string) {
    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }
    return this.purchaseRepository.find({ where, relations: ['lines'] });
  }

  findOne(id: string) {
    return this.purchaseRepository.findOne({ where: { id }, relations: ['lines'] });
  }

  update(id: string, updatePurchaseDto: UpdatePurchaseDto) {
    return this.purchaseRepository.update(id, updatePurchaseDto);
  }

  async findByNumber(companyId: string, type: string, series: string, number: number) {
    return this.purchaseRepository.findOne({
      where: {
        companyId,
        type,
        series,
        number
      },
      relations: ['lines']
    });
  }

  remove(id: string) {
    return this.purchaseRepository.delete(id);
  }
}
