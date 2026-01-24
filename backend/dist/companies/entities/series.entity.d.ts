import { Company } from './company.entity';
export declare class Series {
    id: string;
    companyId: string;
    company: Company;
    code: string;
    description: string;
    startDate: string;
    endDate: string;
    active: boolean;
    module: string;
    createdAt: Date;
    updatedAt: Date;
}
