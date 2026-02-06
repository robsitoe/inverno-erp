import { join } from 'path';
import { Account } from '../accounting/entities/account.entity';
import { JournalEntry, JournalLine } from '../accounting/entities/journal-entry.entity';
import { Journal } from '../accounting/entities/journal.entity';
import { Company } from '../companies/entities/company.entity';
import { FiscalYear } from '../companies/entities/fiscal-year.entity';
import { Series } from '../companies/entities/series.entity';
import { GenericEntity } from '../common-entities/generic-entity.entity';
import { DocumentType } from '../common-entities/entities/document-type.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Article } from '../inventory/entities/article.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { PurchaseDocument, PurchaseDocumentLine } from '../purchases/entities/purchase.entity';
import { SalesDocument, SalesDocumentLine } from '../sales/entities/sales-document.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { PaymentMethod } from '../treasury/entities/payment-method.entity';
import { TreasuryDocument, TreasuryDocumentLine } from '../treasury/entities/treasury.entity';
import { User } from '../users/entities/user.entity';

const SHARED_TENANT_ENTITIES = [
  Account,
  JournalEntry,
  JournalLine,
  Article,
  StockMovement,
  SalesDocument,
  SalesDocumentLine,
  PurchaseDocument,
  PurchaseDocumentLine,
  TreasuryDocument,
  TreasuryDocumentLine,
  FiscalYear,
  Journal,
  Customer,
  Supplier,
  Series,
  GenericEntity,
  DocumentType,
  PaymentMethod,
];

export const MAIN_ENTITIES = [Company, User, ...SHARED_TENANT_ENTITIES];
export const TENANT_ENTITIES = SHARED_TENANT_ENTITIES;

export const MAIN_MIGRATIONS_GLOB = join(__dirname, 'migrations', 'main', '*{.ts,.js}');
export const TENANT_MIGRATIONS_GLOB = join(__dirname, 'migrations', 'tenant', '*{.ts,.js}');

export function isEnvEnabled(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
