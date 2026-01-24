import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { Account } from './entities/account.entity';
import { JournalEntry, JournalLine } from './entities/journal-entry.entity';
export declare class AccountingService {
    private readonly accountRepository;
    private readonly journalEntryRepository;
    private readonly journalLineRepository;
    constructor(accountRepository: Repository<Account>, journalEntryRepository: Repository<JournalEntry>, journalLineRepository: Repository<JournalLine>);
    create(createAccountDto: CreateAccountDto | CreateAccountDto[]): Promise<Account | Account[]>;
    findAll(): Promise<Account[]>;
    findOne(id: string): Promise<Account>;
    update(id: string, updateAccountDto: UpdateAccountDto): Promise<Account>;
    remove(id: string): Promise<Account>;
    createJournalEntry(createJournalEntryDto: CreateJournalEntryDto): Promise<JournalEntry>;
    findAllJournalEntries(): Promise<JournalEntry[]>;
    findOneJournalEntry(id: string): Promise<JournalEntry>;
}
