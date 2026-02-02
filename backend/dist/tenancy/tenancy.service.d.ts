import { OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
export declare class TenancyService implements OnModuleDestroy {
    private mainDataSource;
    private dataSources;
    private pendingConnections;
    constructor(mainDataSource: DataSource);
    getTenantDataSource(companyId: string): Promise<DataSource>;
    private initializeTenantConnection;
    private createDatabase;
    private sanitizeDatabaseName;
    onModuleDestroy(): Promise<void>;
    private seedTenantData;
}
