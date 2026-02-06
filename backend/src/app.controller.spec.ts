import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenancyService } from './tenancy/tenancy.service';
import { PeriodControlService } from './periods/period-control.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DataSource, useValue: { getRepository: jest.fn(), createQueryRunner: jest.fn() } },
        { provide: TenancyService, useValue: { getTenantDataSource: jest.fn() } },
        {
          provide: PeriodControlService,
          useValue: {
            getClosureChecklist: jest.fn(),
            closeFiscalYear: jest.fn(),
            reopenFiscalYear: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
