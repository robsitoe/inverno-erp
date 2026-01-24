"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const company_entity_1 = require("./companies/entities/company.entity");
const fiscal_year_entity_1 = require("./companies/entities/fiscal-year.entity");
const user_entity_1 = require("./users/entities/user.entity");
const bcrypt = __importStar(require("bcrypt"));
async function seedDatabase(dataSource) {
    console.log('🌱 Starting database seeding...');
    const companyRepo = dataSource.getRepository(company_entity_1.Company);
    const fiscalYearRepo = dataSource.getRepository(fiscal_year_entity_1.FiscalYear);
    const userRepo = dataSource.getRepository(user_entity_1.User);
    const existingCompanies = await companyRepo.count();
    if (existingCompanies === 0) {
        console.log('📦 Creating default company...');
        const defaultCompany = {
            id: 'company-001',
            name: 'Inverno ERP - Empresa Demo',
            nif: '123456789',
            address: 'Maputo, Moçambique',
            email: 'info@inverno-erp.com',
            phone: '+258 84 000 0000',
            website: 'https://inverno-erp.com',
            currentYear: 2026,
            type: 'LDA',
            category: 'Serviços',
            country: 'Moçambique',
            location: 'Maputo',
            chartOfAccounts: 'PGCM',
            currency: 'MZN',
            logoUrl: '',
            seriesConfig: {},
            documentNameFormat: 'standard',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await companyRepo.save(defaultCompany);
        console.log('✅ Default company created:', defaultCompany.name);
        console.log('📅 Creating fiscal year...');
        const fiscalYear = {
            id: 'fy-2026-001',
            companyId: 'company-001',
            year: 2026,
            isCurrent: true,
            status: 'OPEN',
        };
        await fiscalYearRepo.save(fiscalYear);
        console.log('✅ Fiscal year created: 2026');
    }
    else {
        console.log('ℹ️  Companies already exist, skipping company creation');
    }
    const existingAdmin = await userRepo.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
        console.log('👤 Creating admin user...');
        const hashedPassword = await bcrypt.hash('admin', 10);
        const adminUser = {
            id: 'user-admin-001',
            username: 'admin',
            password: hashedPassword,
            name: 'Administrador',
            email: 'admin@inverno-erp.com',
            phone: '',
            isAdmin: true,
            isSuperAdmin: true,
            isTechnical: true,
            isActive: true,
            profile: 'ADMIN',
            language: 'pt',
            permissions: [{ companyId: 'ALL', role: 'ADMIN' }],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await userRepo.save(adminUser);
        console.log('✅ Admin user created (username: admin, password: admin)');
    }
    else {
        console.log('ℹ️  Admin user already exists');
        if (!existingAdmin.permissions || existingAdmin.permissions.length === 0) {
            console.log('🔧 Updating admin permissions...');
            existingAdmin.permissions = [{ companyId: 'ALL', role: 'ADMIN' }];
            await userRepo.save(existingAdmin);
            console.log('✅ Admin permissions updated');
        }
    }
    console.log('🎉 Database seeding completed!');
}
//# sourceMappingURL=seed-data.js.map