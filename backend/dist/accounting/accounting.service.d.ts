import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { Account } from './entities/account.entity';
import { JournalEntry, JournalLine } from './entities/journal-entry.entity';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class AccountingService {
    private readonly tenancyService;
    private readonly defaultAccountRepo;
    private readonly defaultJournalEntryRepo;
    private readonly defaultJournalLineRepo;
    constructor(tenancyService: TenancyService, defaultAccountRepo: Repository<Account>, defaultJournalEntryRepo: Repository<JournalEntry>, defaultJournalLineRepo: Repository<JournalLine>);
    private getRepo;
    private getAccountRepo;
    private getJournalEntryRepo;
    private getJournalLineRepo;
    create(createAccountDto: CreateAccountDto | CreateAccountDto[]): Promise<Account | Account[]>;
    findAll(companyId?: string): Promise<Account[]>;
    findOne(id: string): Promise<Account>;
    update(id: string, updateAccountDto: UpdateAccountDto): Promise<Account>;
    remove(id: string): Promise<Account>;
    createJournalEntry(createJournalEntryDto: CreateJournalEntryDto): Promise<JournalEntry>;
    findAllJournalEntries(companyId?: string): Promise<JournalEntry[]>;
    findOneJournalEntry(id: string): Promise<JournalEntry>;
    getAccountStatement(accountId: string, fromDate?: string, toDate?: string, companyId?: string, includeDrafts?: boolean): Promise<{
        initialBalance: number;
        movements: {
            date: string;
            docType: string;
            docNumber: string;
            description: string;
            debit: number;
            credit: number;
            balance: number;
        }[];
    }>;
    loadPresetAccountSystem(presetName: string): Promise<any>;
}
