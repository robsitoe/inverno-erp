import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesDocument)
    private readonly salesDocumentRepository: Repository<SalesDocument>,
    @InjectRepository(SalesDocumentLine)
    private readonly salesDocumentLineRepository: Repository<SalesDocumentLine>,
  ) { }

  async create(createSalesDocumentDto: CreateSalesDocumentDto) {
    const { lines, ...documentData } = createSalesDocumentDto;

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

      return this.salesDocumentLineRepository.create({
        ...line,
        total,
      });
    });

    const total = subtotal + totalIva;

    let seriesNumber = documentData.seriesNumber;
    let documentNumber = documentData.documentNumber;

    // If it's a new document (no ID), we usually want to auto-generate the number
    // if it wasn't provided or force the next one.
    if (!documentData.id) {
      if (!seriesNumber) {
        const lastDoc = await this.salesDocumentRepository.findOne({
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

    const document = this.salesDocumentRepository.create({
      ...documentData,
      documentNumber,
      seriesNumber,
      subtotal,
      totalIva,
      discounts,
      total,
      lines: documentLines,
    });

    return this.salesDocumentRepository.save(document);
  }

  findAll(companyId?: string) {
    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }

    return this.salesDocumentRepository.find({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
      relations: ['lines']
    });
  }

  async findOne(id: string) {
    const document = await this.salesDocumentRepository.findOne({
      where: { id },
      relations: ['lines']
    });
    if (!document) {
      throw new NotFoundException(`Sales Document with ID ${id} not found`);
    }
    return document;
  }

  async update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto) {
    const document = await this.findOne(id);
    // Note: Updating complex documents with lines requires more logic (re-calculating totals, handling line updates/deletes)
    // For now, we'll just update the main fields
    this.salesDocumentRepository.merge(document, updateSalesDocumentDto);
    return this.salesDocumentRepository.save(document);
  }

  async findByNumber(companyId: string, type: string, series: string, number: number) {
    const document = await this.salesDocumentRepository.findOne({
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
    const document = await this.findOne(id);
    return this.salesDocumentRepository.remove(document);
  }
}
