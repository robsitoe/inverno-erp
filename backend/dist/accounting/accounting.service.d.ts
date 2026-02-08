import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { Account } from './entities/account.entity';
import { JournalEntry, JournalLine } from './entities/journal-entry.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { PeriodControlService } from '../periods/period-control.service';
interface AccountingMvpRecord {
    id: string;
    code?: string;
    description?: string;
    active?: boolean;
    period?: {
        fromDate?: string;
        toDate?: string;
    };
    createdAt: string;
}
interface PeriodCloseRecord {
    id: string;
    year: number;
    month: number;
    status: 'CLOSED';
    createdAt: string;
}
export declare class AccountingService {
    private readonly tenancyService;
    private readonly periodControlService;
    private readonly defaultAccountRepo;
    private readonly defaultJournalEntryRepo;
    private readonly defaultJournalLineRepo;
    constructor(tenancyService: TenancyService, periodControlService: PeriodControlService, defaultAccountRepo: Repository<Account>, defaultJournalEntryRepo: Repository<JournalEntry>, defaultJournalLineRepo: Repository<JournalLine>);
    private readonly costCenters;
    private readonly periodClosures;
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
    listCostCenters(): Promise<AccountingMvpRecord[]>;
    createCostCenter(payload: {
        code: string;
        description: string;
        active?: boolean;
    }): Promise<AccountingMvpRecord>;
    getVatSummary(fromDate?: string, toDate?: string): Promise<{
        fromDate: string | undefined;
        toDate: string | undefined;
        vatSettled: number;
        vatDeductible: number;
        generatedAt: string;
    }>;
    closePeriod(payload: {
        year: number;
        month: number;
    }): Promise<PeriodCloseRecord>;
    getExplorationSummary(fromDate?: string, toDate?: string): Promise<{
        period: {
            fromDate: string | undefined;
            toDate: string | undefined;
        };
        totalDebit: number;
        totalCredit: number;
        topVariations: never[];
        generatedAt: string;
    }>;
    getUtilitiesAuditLog(page?: number, limit?: number): Promise<{
        page: number;
        limit: number;
        total: number;
        records: {
            id: string;
            action: string;
            reference: string;
            createdAt: string;
        }[];
    }>;
}
export {};
