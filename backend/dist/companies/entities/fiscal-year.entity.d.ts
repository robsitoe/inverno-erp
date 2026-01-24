import { Company } from './company.entity';
export declare class FiscalYear {
    id: string;
    year: number;
    isCurrent: boolean;
    status: string;
    startDate: string;
    endDate: string;
    companyId: string;
    company: Company;
}
