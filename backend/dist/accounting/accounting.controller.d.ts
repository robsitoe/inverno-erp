import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
export declare class AccountingController {
    private readonly accountingService;
    constructor(accountingService: AccountingService);
    create(createAccountDto: CreateAccountDto | CreateAccountDto[]): Promise<import("./entities/account.entity").Account | import("./entities/account.entity").Account[]>;
    findAll(companyId?: string): Promise<import("./entities/account.entity").Account[]>;
    findOne(id: string): Promise<import("./entities/account.entity").Account>;
    update(id: string, updateAccountDto: UpdateAccountDto): Promise<import("./entities/account.entity").Account>;
    remove(id: string): Promise<import("./entities/account.entity").Account>;
    createJournalEntry(createJournalEntryDto: CreateJournalEntryDto): Promise<import("./entities/journal-entry.entity").JournalEntry>;
    findAllJournalEntries(companyId?: string): Promise<import("./entities/journal-entry.entity").JournalEntry[]>;
    findOneJournalEntry(id: string): Promise<import("./entities/journal-entry.entity").JournalEntry>;
    getStatement(accountId: string, fromDate?: string, toDate?: string, companyId?: string, includeDrafts?: string): Promise<any>;
    clearAccounts(companyId?: string): Promise<import("typeorm").DeleteResult>;
    loadPreset(presetName: string, companyId?: string): Promise<any>;
    recalculateBalances(companyId?: string): Promise<{
        success: boolean;
        processedEntries: number;
    }>;
    listCostCenters(): Promise<any>;
    createCostCenter(payload: {
        code: string;
        description: string;
        active?: boolean;
    }): Promise<any>;
    getVatSummary(fromDate?: string, toDate?: string): Promise<any>;
    closePeriod(payload: {
        year: number;
        month: number;
    }): Promise<any>;
    getExplorationSummary(fromDate?: string, toDate?: string): Promise<any>;
    getUtilitiesAuditLog(page?: number, limit?: number): Promise<any>;
}
