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

    // Get next number for series (simplified)
    const lastDoc = await this.salesDocumentRepository.findOne({
      where: { documentType: (documentData as any).documentType, series: documentData.series },
      order: { documentNumber: 'DESC' } as any,
    });
    const nextNumber = (Number(lastDoc?.documentNumber) || 0) + 1;
    const documentNumber = `${(documentData as any).documentType} ${documentData.series}/${nextNumber}`;

    const document = this.salesDocumentRepository.create({
      ...documentData,
      documentNumber,
      seriesNumber: nextNumber,
      subtotal,
      totalIva,
      discounts,
      total,
      lines: documentLines,
    });

    return this.salesDocumentRepository.save(document);
  }

  findAll() {
    return this.salesDocumentRepository.find({
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

  async remove(id: string) {
    const document = await this.findOne(id);
    return this.salesDocumentRepository.remove(document);
  }
}
