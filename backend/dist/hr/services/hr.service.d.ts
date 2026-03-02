import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Absence, AbsenceStatus } from '../entities/absence.entity';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { TenancyService } from '../../tenancy/tenancy.service';
export declare class HRService {
    private readonly tenancyService;
    private readonly defaultEmployeeRepo;
    private readonly defaultAbsenceRepo;
    constructor(tenancyService: TenancyService, defaultEmployeeRepo: Repository<Employee>, defaultAbsenceRepo: Repository<Absence>);
    private getRepo;
    private getEmployeeRepo;
    private getAbsenceRepo;
    create(createEmployeeDto: CreateEmployeeDto): Promise<Employee>;
    findAll(companyId?: string): Promise<Employee[]>;
    findOne(id: string): Promise<Employee>;
    update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee>;
    remove(id: string): Promise<Employee>;
    createAbsence(data: any): Promise<Absence[]>;
    findAllAbsences(companyId?: string, employeeId?: string): Promise<Absence[]>;
    updateAbsenceStatus(id: string, status: AbsenceStatus): Promise<Absence>;
}
