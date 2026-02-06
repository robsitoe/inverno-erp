import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  QueryFailedError,
  Repository,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import {
  SalesDocument,
  SalesDocumentLine,
} from './entities/sales-document.entity';
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
  ) {}

  private async getRepo<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    defaultRepo: Repository<T>,
  ): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(companyId);
    return ds.getRepository(entity);
  }

  private async getSalesDocRepo() {
    return this.getRepo(SalesDocument, this.defaultSalesDocumentRepo);
  }

  async create(createSalesDocumentDto: CreateSalesDocumentDto) {
    await this.periodControlService.ensureDateInOpenPeriod(createSalesDocumentDto.date, createSalesDocumentDto.companyId);
    const { lines, ...documentData } = createSalesDocumentDto;

    const sdRepo = await this.getSalesDocRepo();

    // Calculate totals
    let subtotal = 0;
    let totalIva = 0;
    let discounts = 0;

    const normalizedLines = lines.map((line) => {
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

      return {
        ...line,
        total,
      };
    });

    const total = subtotal + totalIva;
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await sdRepo.manager.transaction(async (manager) => {
          const transactionalSdRepo = manager.getRepository(SalesDocument);
          const transactionalSlRepo = manager.getRepository(SalesDocumentLine);

          let seriesNumber = documentData.seriesNumber;
          let documentNumber = documentData.documentNumber;

          // If it's a new document (no ID), we usually want to auto-generate the number
          if (!documentData.id) {
            if (!seriesNumber) {
              const lastDoc = await transactionalSdRepo
                .createQueryBuilder('salesDocument')
                .where('salesDocument.documentType = :documentType', {
                  documentType: documentData.documentType,
                })
                .andWhere('salesDocument.series = :series', {
                  series: documentData.series,
                })
                .andWhere('salesDocument.companyId = :companyId', {
                  companyId: documentData.companyId,
                })
                .orderBy('salesDocument.seriesNumber', 'DESC')
                .setLock('pessimistic_write')
                .getOne();

              seriesNumber = (lastDoc?.seriesNumber || 0) + 1;
            }

            // Enforce documentNumber format
            if (!documentNumber || documentNumber.includes('undefined')) {
              documentNumber = `${documentData.documentType} ${documentData.series}/${seriesNumber}`;
            }
          }

          const documentLines = normalizedLines.map((line) =>
            transactionalSlRepo.create(line),
          );

          const document = transactionalSdRepo.create({
            ...documentData,
            documentNumber,
            seriesNumber,
            subtotal,
            totalIva,
            discounts,
            total,
            lines: documentLines,
          });

          return transactionalSdRepo.save(document);
        });
      } catch (error) {
        const isNumberingConflict =
          this.isUniqueViolation(error) &&
          !documentData.id &&
          !documentData.seriesNumber;

        if (isNumberingConflict) {
          attempt += 1;
          if (attempt < maxRetries) {
            continue;
          }
          throw new ConflictException(
            'Unable to generate a unique document number after multiple retries',
          );
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to generate a unique document number');
  }

  private isUniqueViolation(error: unknown) {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const queryError = error as QueryFailedError & {
      driverError?: {
        code?: string;
      };
    };
    const code = queryError.driverError?.code;

    return (
      code === '23505' ||
      code === 'ER_DUP_ENTRY' ||
      code === 'SQLITE_CONSTRAINT' ||
      code === 'SQLITE_CONSTRAINT_UNIQUE'
    );
  }

  async findAll(companyId?: string) {
    const sdRepo = await this.getSalesDocRepo();
    if (companyId) {
      return sdRepo.find({
        where: { companyId },
        order: { date: 'DESC', createdAt: 'DESC' },
        relations: ['lines'],
      });
    }
    return sdRepo.find({
      order: { date: 'DESC', createdAt: 'DESC' },
      relations: ['lines'],
    });
  }

  async findOne(id: string) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await sdRepo.findOne({
      where: { id },
      relations: ['lines'],
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

  async findByNumber(
    companyId: string,
    type: string,
    series: string,
    number: number,
  ) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await sdRepo.findOne({
      where: {
        companyId,
        documentType: type,
        series,
        seriesNumber: number,
      },
      relations: ['lines'],
    });
    return document;
  }

  async remove(id: string) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await this.findOne(id);
    return sdRepo.remove(document);
  }
}
