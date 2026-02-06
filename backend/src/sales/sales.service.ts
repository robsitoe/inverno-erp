import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { PeriodControlService } from '../periods/period-control.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly periodControlService: PeriodControlService,
    @InjectRepository(SalesDocument)
    private readonly defaultSalesDocumentRepo: Repository<SalesDocument>,
    @InjectRepository(SalesDocumentLine)
    private readonly defaultSalesLineRepo: Repository<SalesDocumentLine>,
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(companyId);
    return ds.getRepository(entity);
  }

  private async getSalesDocRepo() { return this.getRepo(SalesDocument, this.defaultSalesDocumentRepo); }
  private async getSalesLineRepo() { return this.getRepo(SalesDocumentLine, this.defaultSalesLineRepo); }

  async create(createSalesDocumentDto: CreateSalesDocumentDto) {
    await this.periodControlService.ensureDateInOpenPeriod(createSalesDocumentDto.date, createSalesDocumentDto.companyId);
    const { lines, ...documentData } = createSalesDocumentDto;

    const sdRepo = await this.getSalesDocRepo();
    const slRepo = await this.getSalesLineRepo();

    // Calculate totals
    let subtotal = 0;
    let totalIva = 0;
    let discounts = 0;

    const documentLines = lines.map(line => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const discount = Number(line.discount || 0);
      const ivaRate = Number(line.ivaRate || 0);

      const grossAmount = quantity * unitPrice;
      const discountAmount = grossAmount * (discount / 100);
      const netAmount = grossAmount - discountAmount;
      const ivaAmount = netAmount * (ivaRate / 100);
      const total = netAmount + ivaAmount;

      subtotal += netAmount;
      totalIva += ivaAmount;
      discounts += discountAmount;

      return slRepo.create({
        ...line,
        total,
      });
    });

    const total = subtotal + totalIva;

    let seriesNumber = documentData.seriesNumber;
    let documentNumber = documentData.documentNumber;

    // If it's a new document (no ID), we usually want to auto-generate the number
    if (!documentData.id) {
      if (!seriesNumber) {
        const lastDoc = await sdRepo.findOne({
          where: {
            documentType: documentData.documentType,
            series: documentData.series,
            companyId: documentData.companyId
          },
          order: { seriesNumber: 'DESC' } as any,
        });
        seriesNumber = (lastDoc?.seriesNumber || 0) + 1;
      }

      // Enforce documentNumber format
      if (!documentNumber || documentNumber.includes('undefined')) {
        documentNumber = `${documentData.documentType} ${documentData.series}/${seriesNumber}`;
      }
    }

    const document = sdRepo.create({
      ...documentData,
      documentNumber,
      seriesNumber,
      subtotal,
      totalIva,
      discounts,
      total,
      lines: documentLines,
    });

    return sdRepo.save(document);
  }

  async findAll(companyId?: string) {
    const sdRepo = await this.getSalesDocRepo();
    if (companyId) {
      return sdRepo.find({
        where: { companyId },
        order: { date: 'DESC', createdAt: 'DESC' },
        relations: ['lines']
      });
    }
    return sdRepo.find({
      order: { date: 'DESC', createdAt: 'DESC' },
      relations: ['lines']
    });
  }

  async findOne(id: string) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await sdRepo.findOne({
      where: { id },
      relations: ['lines']
    });
    if (!document) {
      throw new NotFoundException(`Sales Document with ID ${id} not found`);
    }
    return document;
  }

  async update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto) {
    if (updateSalesDocumentDto.date) {
      await this.periodControlService.ensureDateInOpenPeriod(updateSalesDocumentDto.date, updateSalesDocumentDto.companyId);
    }
    const sdRepo = await this.getSalesDocRepo();
    const document = await this.findOne(id);
    sdRepo.merge(document, updateSalesDocumentDto);
    return sdRepo.save(document);
  }

  async findByNumber(companyId: string, type: string, series: string, number: number) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await sdRepo.findOne({
      where: {
        companyId,
        documentType: type,
        series,
        seriesNumber: number
      },
      relations: ['lines']
    });
    return document;
  }

  async remove(id: string) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await this.findOne(id);
    return sdRepo.remove(document);
  }
}
