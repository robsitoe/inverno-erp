import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';

@ApiTags('accounting')
@Controller('accounting')
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
  findAll() {
    return this.accountingService.findAll();
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
  findAllJournalEntries() {
    return this.accountingService.findAllJournalEntries();
  }

  @Get('journal-entries/:id')
  @ApiOperation({ summary: 'Get a journal entry by ID' })
  findOneJournalEntry(@Param('id') id: string) {
    return this.accountingService.findOneJournalEntry(id);
  }
}
