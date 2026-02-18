import { CanActivate, ExecutionContext } from '@nestjs/common';
import { LicensesService } from '../../licenses/licenses.service';
export declare class LicenseGuard implements CanActivate {
    private readonly licensesService;
    constructor(licensesService: LicensesService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
