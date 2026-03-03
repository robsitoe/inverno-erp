import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Absence, AbsenceStatus } from '../entities/absence.entity';
import { TaxBracket, HRSettings } from '../entities/hr-settings.entity';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { TenancyService } from '../../tenancy/tenancy.service';
export declare class HRService {
    private readonly tenancyService;
    private readonly defaultEmployeeRepo;
    private readonly defaultAbsenceRepo;
    private readonly defaultTaxBracketRepo;
    private readonly defaultHRSettingsRepo;
    constructor(tenancyService: TenancyService, defaultEmployeeRepo: Repository<Employee>, defaultAbsenceRepo: Repository<Absence>, defaultTaxBracketRepo: Repository<TaxBracket>, defaultHRSettingsRepo: Repository<HRSettings>);
    private getRepo;
    private getEmployeeRepo;
    private getAbsenceRepo;
    private getTaxBracketRepo;
    private getHRSettingsRepo;
    getNextCode(companyId: string): Promise<{
        code: string;
    }>;
    checkCodeAvailability(code: string, companyId: string, excludeId?: string): Promise<{
        available: boolean;
    }>;
    checkNibAvailability(nib: string, companyId: string, excludeId?: string): Promise<{
        available: boolean;
        usedBy?: string;
    }>;
    create(createEmployeeDto: CreateEmployeeDto): Promise<Employee>;
    findAll(companyId?: string): Promise<Employee[]>;
    findOne(id: string, companyId?: string): Promise<Employee>;
    update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee>;
    remove(id: string, companyId?: string): Promise<Employee>;
    createAbsence(data: any): Promise<Absence[]>;
    findAllAbsences(companyId?: string, employeeId?: string): Promise<Absence[]>;
    updateAbsenceStatus(id: string, status: AbsenceStatus): Promise<Absence>;
    updatePhoto(id: string, photoUrl: string, companyId?: string): Promise<Employee>;
    addDocument(id: string, doc: any, companyId?: string): Promise<Employee>;
    removeDocument(id: string, docId: string, companyId?: string): Promise<Employee>;
    findAllTaxBrackets(companyId?: string): Promise<TaxBracket[]>;
    saveTaxBracket(data: any, companyId?: string): Promise<any>;
    deleteTaxBracket(id: string, companyId?: string): Promise<import("typeorm").DeleteResult>;
    getSettings(companyId?: string): Promise<HRSettings>;
    updateSettings(data: any, companyId?: string): Promise<any>;
    getNominalRelation(companyId?: string): Promise<Employee[]>;
    getSeniorityMap(companyId?: string): Promise<Employee[]>;
    getVacationPlan(year: number, companyId?: string): Promise<Absence[]>;
}
