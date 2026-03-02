import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { LicenseGuard } from '../auth/guards/license.guard';

@ApiTags('accounting')
@Controller('accounting')
@UseGuards(LicenseGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) { }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'The account has been successfully created.' })
  create(@Body() createAccountDto: CreateAccountDto | CreateAccountDto[]) {
    return this.accountingService.create(createAccountDto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get all accounts' })
  findAll(@Query('companyId') companyId?: string) {
    return this.accountingService.findAll(companyId);
  }


  @Get('accounts/:id')
  @ApiOperation({ summary: 'Get an account by ID' })
  findOne(@Param('id') id: string) {
    return this.accountingService.findOne(id);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: 'Update an account' })
  update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountingService.update(id, updateAccountDto);
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Delete an account' })
  remove(@Param('id') id: string) {
    return this.accountingService.remove(id);
  }

  // Journal Entries

  @Post('journal-entries')
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'The journal entry has been successfully created.' })
  createJournalEntry(@Body() createJournalEntryDto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(createJournalEntryDto);
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'Get all journal entries' })
  findAllJournalEntries(@Query('companyId') companyId?: string) {
    return this.accountingService.findAllJournalEntries(companyId);
  }


  @Get('journal-entries/:id')
  @ApiOperation({ summary: 'Get a journal entry by ID' })
  findOneJournalEntry(@Param('id') id: string) {
    return this.accountingService.findOneJournalEntry(id);
  }

  @Get('statements/:accountId')
  @ApiOperation({ summary: 'Get account statement' })
  getStatement(
    @Param('accountId') accountId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('companyId') companyId?: string,
    @Query('includeDrafts') includeDrafts?: string
  ): Promise<any> {
    const drafts = includeDrafts === 'true';
    return this.accountingService.getAccountStatement(accountId, fromDate, toDate, companyId, drafts);
  }

  @Delete('accounts')
  @ApiOperation({ summary: 'Clear all accounts for current company' })
  clearAccounts(@Query('companyId') companyId?: string) {
    return this.accountingService.clearAccounts(companyId);
  }

  @Post('accounts/presets/:presetName')
  @ApiOperation({ summary: 'Load a predefined chart of accounts' })
  loadPreset(@Param('presetName') presetName: string, @Query('companyId') companyId?: string) {
    return this.accountingService.loadPresetAccountSystem(presetName, companyId);
  }

  @Post('accounts/recalculate')
  @ApiOperation({ summary: 'Recalculate all account balances from posted journal entries' })
  recalculateBalances(@Query('companyId') companyId?: string) {
    return this.accountingService.recalculateAllBalances(companyId);
  }


  @Get('cost-centers')
  @ApiOperation({ summary: 'List cost centers (MVP)' })
  listCostCenters(): Promise<any> {
    return this.accountingService.listCostCenters();
  }

  @Post('cost-centers')
  @ApiOperation({ summary: 'Create cost center (MVP)' })
  createCostCenter(@Body() payload: { code: string; description: string; active?: boolean }): Promise<any> {
    return this.accountingService.createCostCenter(payload);
  }

  @Get('vat/summary')
  @ApiOperation({ summary: 'Get VAT summary (MVP)' })
  getVatSummary(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string): Promise<any> {
    return this.accountingService.getVatSummary(fromDate, toDate);
  }

  @Post('period-close')
  @ApiOperation({ summary: 'Close accounting period (MVP)' })
  closePeriod(@Body() payload: { year: number; month: number }): Promise<any> {
    return this.accountingService.closePeriod(payload);
  }

  @Get('exploration/summary')
  @ApiOperation({ summary: 'Get exploration summary (MVP)' })
  getExplorationSummary(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string): Promise<any> {
    return this.accountingService.getExplorationSummary(fromDate, toDate);
  }

  @Get('utilities/audit-log')
  @ApiOperation({ summary: 'Get accounting audit log (MVP)' })
  getUtilitiesAuditLog(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ): Promise<any> {
    return this.accountingService.getUtilitiesAuditLog(page, limit);
  }

  @Get('reports/balance-sheet')
  @ApiOperation({ summary: 'Get Balance Sheet (Mozambique standard)' })
  getBalanceSheet(@Query('companyId') companyId?: string): Promise<any> {
    return this.accountingService.getBalanceSheet(companyId);
  }

  @Get('reports/income-statement')
  @ApiOperation({ summary: 'Get Income Statement (Mozambique standard)' })
  getIncomeStatement(@Query('companyId') companyId?: string): Promise<any> {
    return this.accountingService.getIncomeStatement(companyId);
  }
}
