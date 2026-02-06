import { DataSource } from 'typeorm';
import { MAIN_ENTITIES, MAIN_MIGRATIONS_GLOB, isEnvEnabled } from './typeorm.constants';

const dbType = process.env.DB_TYPE ?? 'postgres';

const commonOptions = {
  entities: MAIN_ENTITIES,
  migrations: [MAIN_MIGRATIONS_GLOB],
  synchronize: isEnvEnabled(process.env.DB_SYNCHRONIZE, false),
  migrationsRun: isEnvEnabled(process.env.DB_RUN_MIGRATIONS, false),
};

const dataSource = dbType === 'sqlite'
  ? new DataSource({
      type: 'sqlite',
      database: process.env.DB_DATABASE ?? 'inverno.sqlite',
      ...commonOptions,
    })
  : new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'inverno_erp',
      ...commonOptions,
    });

export default dataSource;
