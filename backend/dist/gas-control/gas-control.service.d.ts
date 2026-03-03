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
        control: GasDailyControl;
        entries: GasDailyEntry[];
    }>;
    saveEntry(data: any, companyId?: string): Promise<any>;
    deleteEntry(id: string, companyId?: string): Promise<import("typeorm").DeleteResult>;
    updateStocks(controlId: string, initialStock: any, finalStock: any, companyId?: string): Promise<GasDailyControl>;
    saveCylinderType(data: any, companyId?: string): Promise<any>;
}
