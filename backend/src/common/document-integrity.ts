import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountingService } from '../accounting/accounting.service';
import { JournalEntry } from '../accounting/entities/journal-entry.entity';

/**
 * Regras comuns dos documentos fiscais (vendas e compras):
 * emitido = aprovado ou lançado; anulado = marcado em voidedAt (definitivo).
 */
export const isIssued = (status: any) => status === 'APPROVED' || status === 'POSTED';

const fmt = (d: any) => String(d || '').slice(0, 10).split('-').reverse().join('/');

/** Mensagem única para quem tenta alterar um documento emitido. */
export function issuedLockError(documentNumber: string) {
  return new BadRequestException(
    `O documento ${documentNumber} já foi emitido e não pode ser alterado. Para o corrigir, anule-o ou emita uma nota de crédito.`,
  );
}

/** A data de um documento não pode ficar antes do documento anterior nem depois do seguinte da mesma série. */
export function assertDateBetween(date: string, prev?: { date: any; documentNumber?: string } | null, next?: { date: any; documentNumber?: string } | null) {
  const d = String(date || '').slice(0, 10);
  if (prev && d < String(prev.date).slice(0, 10)) {
    throw new BadRequestException(`A data ${fmt(d)} é anterior à do documento ${prev.documentNumber || 'anterior'} (${fmt(prev.date)}). Os documentos da mesma série têm de seguir a ordem das datas.`);
  }
  if (next && d > String(next.date).slice(0, 10)) {
    throw new BadRequestException(`A data ${fmt(d)} é posterior à do documento seguinte ${next.documentNumber || ''} (${fmt(next.date)}). Os documentos da mesma série têm de seguir a ordem das datas.`);
  }
}

/** Erro de chave única do PostgreSQL (dois documentos com o mesmo número). */
export const isUniqueViolation = (e: any) => e?.code === '23505' || /duplicate key|unique constraint/i.test(String(e?.message || ''));

/**
 * Estorna no servidor os lançamentos contabilísticos de um documento anulado (idempotente:
 * um lançamento que já tem estorno não é estornado outra vez). O lançamento original fica como está,
 * o estorno inverte débitos e créditos com a data do dia.
 */
export async function reverseJournalEntriesOf(
  ds: DataSource, accounting: AccountingService,
  opts: { companyId: string; documentId: string; sourceType: 'SALE' | 'PURCHASE'; documentNumber: string; reason: string; user?: any },
): Promise<number> {
  const repo = ds.getRepository(JournalEntry);
  const entries = await repo.find({ where: { sourceDocument: opts.documentId, sourceType: opts.sourceType, status: 'POSTED' }, relations: ['lines'] });
  if (!entries.length) return 0;
  const reversals = await repo.find({ where: { sourceType: 'REVERSAL' } });
  const done = new Set(reversals.map(r => r.relatedEntryId).filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);
  let n = 0;
  for (const e of entries) {
    if (done.has(e.id)) continue;
    await accounting.createJournalEntry({
      companyId: opts.companyId,
      journalId: e.journalId,
      date: today,
      description: `Estorno por anulação de ${opts.documentNumber} — ${e.description}`,
      reference: e.reference,
      sourceDocument: opts.documentId,
      sourceType: 'REVERSAL',
      relatedEntryId: e.id,
      correctionReason: opts.reason,
      createdBy: opts.user?.username || opts.user?.name || 'Sistema',
      status: 'POSTED',
      lines: (e.lines || []).map(l => ({
        accountId: l.accountId, accountCode: l.accountCode, accountName: l.accountName,
        description: `Estorno: ${l.description || ''}`.trim(),
        debit: Number(l.credit) || 0, credit: Number(l.debit) || 0,
        costCenterId: l.costCenterId, costCenterCode: l.costCenterCode,
      })),
    } as any);
    n++;
  }
  return n;
}
