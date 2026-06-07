import { DataSource } from 'typeorm';
import { Company } from './companies/entities/company.entity';
import { FiscalYear } from './companies/entities/fiscal-year.entity';
import { User } from './users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
    console.log('🌱 Starting database seeding...');

    const companyRepo = dataSource.getRepository(Company);
    const fiscalYearRepo = dataSource.getRepository(FiscalYear);
    const userRepo = dataSource.getRepository(User);

    // Check if companies already exist
    const existingCompanies = await companyRepo.count();

    // Demo company is only seeded when SEED_DEMO is enabled (default true for dev).
    // Production installs should set SEED_DEMO=false for a clean start.
    const seedDemo = process.env.SEED_DEMO !== 'false';

    if (existingCompanies === 0 && seedDemo) {
        console.log('📦 Creating default company...');

        const defaultCompany: Company = {
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

        // Create fiscal year for the company
        console.log('📅 Creating fiscal year...');
        const fiscalYear: Partial<FiscalYear> = {
            id: 'fy-2026-001',
            companyId: 'company-001',
            year: 2026,
            isCurrent: true,
            status: 'OPEN',
        };

        await fiscalYearRepo.save(fiscalYear);
        console.log('✅ Fiscal year created: 2026');
    } else {
        console.log('ℹ️  Companies already exist, skipping company creation');
    }

    // Check if admin user exists
    const existingAdmin = await userRepo.findOne({ where: { username: 'admin' } });

    if (!existingAdmin) {
        console.log('👤 Creating admin user...');

        const hashedPassword = await bcrypt.hash('admin', 10);

        const adminUser: User = {
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
    } else {
        console.log('ℹ️  Admin user already exists');

        // Update admin permissions if they don't have ALL access
        if (!existingAdmin.permissions || existingAdmin.permissions.length === 0) {
            console.log('🔧 Updating admin permissions...');
            existingAdmin.permissions = [{ companyId: 'ALL', role: 'ADMIN' }];
            await userRepo.save(existingAdmin);
            console.log('✅ Admin permissions updated');
        }
    }

    console.log('🎉 Database seeding completed!');
}
