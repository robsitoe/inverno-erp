import { GasControlService } from './gas-control.service';
export declare class GasControlController {
    private readonly gasService;
    constructor(gasService: GasControlService);
    getCylinderTypes(companyId?: string): Promise<import("./gas-control.entity").GasCylinderType[]>;
    saveCylinderType(data: any, companyId?: string): Promise<any>;
    getDaily(date: string, companyId?: string): Promise<{
        control: any;
        entries: never[];
    } | {
        control: import("./gas-control.entity").GasDailyControl;
        entries: import("./gas-control.entity").GasDailyEntry[];
    }>;
    saveEntry(data: any, companyId?: string): Promise<any>;
    deleteEntry(id: string, companyId?: string): Promise<import("typeorm").DeleteResult>;
    openDaily(body: {
        date: string;
        user: string;
    }, companyId?: string): Promise<import("./gas-control.entity").GasDailyControl>;
    closeDaily(id: string, body: {
        user: string;
    }, companyId?: string): Promise<import("./gas-control.entity").GasDailyControl>;
    updateStocks(id: string, body: {
        initialStock: any;
        finalStock: any;
        user: string;
    }, companyId?: string): Promise<import("./gas-control.entity").GasDailyControl>;
}
