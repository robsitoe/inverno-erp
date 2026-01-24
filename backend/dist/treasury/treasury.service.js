"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const treasury_entity_1 = require("./entities/treasury.entity");
let TreasuryService = class TreasuryService {
    treasuryRepository;
    constructor(treasuryRepository) {
        this.treasuryRepository = treasuryRepository;
    }
    create(createTreasuryDto) {
        const treasury = this.treasuryRepository.create(createTreasuryDto);
        return this.treasuryRepository.save(treasury);
    }
    findAll() {
        return this.treasuryRepository.find({ relations: ['lines'] });
    }
    findOne(id) {
        return this.treasuryRepository.findOne({ where: { id }, relations: ['lines'] });
    }
    update(id, updateTreasuryDto) {
        return this.treasuryRepository.update(id, updateTreasuryDto);
    }
    remove(id) {
        return this.treasuryRepository.delete(id);
    }
    findAllReceipts() {
        return this.treasuryRepository.find({ where: { type: treasury_entity_1.TreasuryDocumentType.RECEIPT }, relations: ['lines'] });
    }
    createReceipt(data) {
        const receipt = this.treasuryRepository.create({ ...data, type: treasury_entity_1.TreasuryDocumentType.RECEIPT });
        return this.treasuryRepository.save(receipt);
    }
    findAllPayments() {
        return this.treasuryRepository.find({ where: { type: treasury_entity_1.TreasuryDocumentType.PAYMENT }, relations: ['lines'] });
    }
    createPayment(data) {
        const payment = this.treasuryRepository.create({ ...data, type: treasury_entity_1.TreasuryDocumentType.PAYMENT });
        return this.treasuryRepository.save(payment);
    }
};
exports.TreasuryService = TreasuryService;
exports.TreasuryService = TreasuryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(treasury_entity_1.TreasuryDocument)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TreasuryService);
//# sourceMappingURL=treasury.service.js.map