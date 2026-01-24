import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { Account } from './entities/account.entity';
import { JournalEntry, JournalLine } from './entities/journal-entry.entity';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepository: Repository<JournalLine>,
  ) { }

  // Accounts

  async create(createAccountDto: CreateAccountDto | CreateAccountDto[]) {
    if (Array.isArray(createAccountDto)) {
      const accounts = this.accountRepository.create(createAccountDto);
      return this.accountRepository.save(accounts);
    }
    const account = this.accountRepository.create(createAccountDto);
    return this.accountRepository.save(account);
  }

  findAll() {
    return this.accountRepository.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string) {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto) {
    const account = await this.findOne(id);
    this.accountRepository.merge(account, updateAccountDto);
    return this.accountRepository.save(account);
  }

  async remove(id: string) {
    const account = await this.findOne(id);
    return this.accountRepository.remove(account);
  }

  // Journal Entries

  async createJournalEntry(createJournalEntryDto: CreateJournalEntryDto) {
    const { lines } = createJournalEntryDto;

    // Validate that debits equal credits
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(`Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    const journalEntry = this.journalEntryRepository.create({
      ...createJournalEntryDto,
      lines: lines.map(line => this.journalLineRepository.create(line)),
    });

    return this.journalEntryRepository.save(journalEntry);
  }

  findAllJournalEntries() {
    return this.journalEntryRepository.find({
      relations: ['lines'],
      order: { date: 'DESC', createdAt: 'DESC' }
    });
  }

  async findOneJournalEntry(id: string) {
    const entry = await this.journalEntryRepository.findOne({
      where: { id },
      relations: ['lines']
    });
    if (!entry) {
      throw new NotFoundException(`Journal Entry with ID ${id} not found`);
    }
    return entry;
  }
}
