import { Repository } from 'typeorm';
import { GasCylinderType, GasDailyControl, GasDailyEntry } from './gas-control.entity';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class GasControlService {
    private readonly defaultTypeRepo;
    private readonly defaultControlRepo;
    private readonly defaultEntryRepo;
    private readonly tenancyService;
    constructor(defaultTypeRepo: Repository<GasCylinderType>, defaultControlRepo: Repository<GasDailyControl>, defaultEntryRepo: Repository<GasDailyEntry>, tenancyService: TenancyService);
    private getRepo;
    getCylinderTypes(companyId?: string): Promise<GasCylinderType[]>;
    getDailyControl(date: string, companyId?: string): Promise<{
        control: any;
        entries: never[];
    } | {
        control: GasDailyControl;
        entries: GasDailyEntry[];
    }>;
    saveEntry(data: any, companyId?: string): Promise<any>;
    deleteEntry(id: string, companyId?: string): Promise<import("typeorm").DeleteResult>;
    openDaily(date: string, user: string, companyId?: string): Promise<GasDailyControl>;
    closeDaily(id: string, user: string, companyId?: string): Promise<GasDailyControl>;
    updateStocks(controlId: string, initialStock: any, finalStock: any, user: string, companyId?: string): Promise<GasDailyControl>;
    saveCylinderType(data: any, companyId?: string): Promise<any>;
}
