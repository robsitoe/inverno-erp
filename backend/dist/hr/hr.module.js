"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HRModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const employee_entity_1 = require("./entities/employee.entity");
const payroll_entity_1 = require("./entities/payroll.entity");
const absence_entity_1 = require("./entities/absence.entity");
const salary_history_entity_1 = require("./entities/salary-history.entity");
const hr_settings_entity_1 = require("./entities/hr-settings.entity");
const petty_cash_voucher_entity_1 = require("../treasury/entities/petty-cash-voucher.entity");
const hr_service_1 = require("./services/hr.service");
const hr_controller_1 = require("./controllers/hr.controller");
const payroll_service_1 = require("./services/payroll.service");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const accounting_module_1 = require("../accounting/accounting.module");
let HRModule = class HRModule {
};
exports.HRModule = HRModule;
exports.HRModule = HRModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([employee_entity_1.Employee, payroll_entity_1.Payroll, absence_entity_1.Absence, hr_settings_entity_1.TaxBracket, hr_settings_entity_1.HRSettings, petty_cash_voucher_entity_1.PettyCashVoucher, salary_history_entity_1.EmployeeSalaryHistory]),
            tenancy_module_1.TenancyModule,
            accounting_module_1.AccountingModule,
        ],
        controllers: [hr_controller_1.HRController],
        providers: [hr_service_1.HRService, payroll_service_1.PayrollService],
        exports: [hr_service_1.HRService],
    })
], HRModule);
//# sourceMappingURL=hr.module.js.map