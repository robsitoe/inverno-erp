import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('accounting')
@Controller('accounting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('accounts')
  @Roles('accounting:create')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: 201,
    description: 'The account has been successfully created.',
  })
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
  @Roles('accounting:update')
  @ApiOperation({ summary: 'Update an account' })
  update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountingService.update(id, updateAccountDto);
  }

  @Delete('accounts/:id')
  @Roles('accounting:delete')
  @ApiOperation({ summary: 'Delete an account' })
  remove(@Param('id') id: string) {
    return this.accountingService.remove(id);
  }

  // Journal Entries

  @Post('journal-entries')
  @Roles('accounting:create')
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({
    status: 201,
    description: 'The journal entry has been successfully created.',
  })
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
    @Query('includeDrafts') includeDrafts?: string,
  ) {
    const drafts = includeDrafts === 'true';
    return this.accountingService.getAccountStatement(
      accountId,
      fromDate,
      toDate,
      companyId,
      drafts,
    );
  }

  @Post('accounts/presets/:presetName')
  @Roles('accounting:update')
  @ApiOperation({ summary: 'Load a predefined chart of accounts' })
  loadPreset(@Param('presetName') presetName: string) {
    return this.accountingService.loadPresetAccountSystem(presetName);
  }
}
