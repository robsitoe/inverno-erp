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

  create(createPurchaseDto: CreatePurchaseDto) {
    const purchase = this.purchaseRepository.create(createPurchaseDto);
    return this.purchaseRepository.save(purchase);
  }

  findAll() {
    return this.purchaseRepository.find({ relations: ['lines'] });
  }

  findOne(id: string) {
    return this.purchaseRepository.findOne({ where: { id }, relations: ['lines'] });
  }

  update(id: string, updatePurchaseDto: UpdatePurchaseDto) {
    return this.purchaseRepository.update(id, updatePurchaseDto);
  }

  remove(id: string) {
    return this.purchaseRepository.delete(id);
  }
}
