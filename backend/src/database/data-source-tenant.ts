import { DataSource } from 'typeorm';
import { TENANT_ENTITIES, TENANT_MIGRATIONS_GLOB, isEnvEnabled } from './typeorm.constants';

const dbType = process.env.TENANT_DB_TYPE ?? process.env.DB_TYPE ?? 'postgres';

const commonOptions = {
  entities: TENANT_ENTITIES,
  migrations: [TENANT_MIGRATIONS_GLOB],
  synchronize: isEnvEnabled(process.env.TENANT_DB_SYNCHRONIZE, false),
  migrationsRun: isEnvEnabled(process.env.TENANT_DB_RUN_MIGRATIONS, false),
};

const dataSource = dbType === 'sqlite'
  ? new DataSource({
      type: 'sqlite',
      database: process.env.TENANT_DB_DATABASE ?? 'inverno-tenant.sqlite',
      ...commonOptions,
    })
  : new DataSource({
      type: 'postgres',
      host: process.env.TENANT_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.TENANT_DB_PORT ?? process.env.DB_PORT ?? 5432),
      username: process.env.TENANT_DB_USERNAME ?? process.env.DB_USERNAME ?? 'postgres',
      password: process.env.TENANT_DB_PASSWORD ?? process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.TENANT_DB_DATABASE ?? 'inverno_erp_tenant',
      ...commonOptions,
    });

export default dataSource;
