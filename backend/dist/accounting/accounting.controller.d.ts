import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
export declare class AccountingController {
    private readonly accountingService;
    constructor(accountingService: AccountingService);
    create(createAccountDto: CreateAccountDto | CreateAccountDto[]): Promise<import("./entities/account.entity").Account | import("./entities/account.entity").Account[]>;
    findAll(): Promise<import("./entities/account.entity").Account[]>;
    findOne(id: string): Promise<import("./entities/account.entity").Account>;
    update(id: string, updateAccountDto: UpdateAccountDto): Promise<import("./entities/account.entity").Account>;
    remove(id: string): Promise<import("./entities/account.entity").Account>;
    createJournalEntry(createJournalEntryDto: CreateJournalEntryDto): Promise<import("./entities/journal-entry.entity").JournalEntry>;
    findAllJournalEntries(): Promise<import("./entities/journal-entry.entity").JournalEntry[]>;
    findOneJournalEntry(id: string): Promise<import("./entities/journal-entry.entity").JournalEntry>;
}
