import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { TreasuryDocument, TreasuryDocumentType } from './entities/treasury.entity';

@Injectable()
export class TreasuryService {
  constructor(
    @InjectRepository(TreasuryDocument)
    private treasuryRepository: Repository<TreasuryDocument>,
  ) { }

  create(createTreasuryDto: CreateTreasuryDto) {
    const treasury = this.treasuryRepository.create(createTreasuryDto);
    return this.treasuryRepository.save(treasury);
  }

  findAll() {
    return this.treasuryRepository.find({ relations: ['lines'] });
  }

  findOne(id: string) {
    return this.treasuryRepository.findOne({ where: { id }, relations: ['lines'] });
  }

  update(id: string, updateTreasuryDto: UpdateTreasuryDto) {
    return this.treasuryRepository.update(id, updateTreasuryDto);
  }

  remove(id: string) {
    return this.treasuryRepository.delete(id);
  }

  findAllReceipts() {
    return this.treasuryRepository.find({ where: { type: TreasuryDocumentType.RECEIPT }, relations: ['lines'] });
  }

  createReceipt(data: any) {
    const receipt = this.treasuryRepository.create({ ...data, type: TreasuryDocumentType.RECEIPT });
    return this.treasuryRepository.save(receipt);
  }

  findAllPayments() {
    return this.treasuryRepository.find({ where: { type: TreasuryDocumentType.PAYMENT }, relations: ['lines'] });
  }

  createPayment(data: any) {
    const payment = this.treasuryRepository.create({ ...data, type: TreasuryDocumentType.PAYMENT });
    return this.treasuryRepository.save(payment);
  }
}
